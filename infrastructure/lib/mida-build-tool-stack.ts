import * as path from 'node:path';

import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as customResources from 'aws-cdk-lib/custom-resources';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

import { type MidaStage } from '../config/environments';

export interface MidaBuildToolStackProps extends cdk.StackProps {
  readonly deploymentEnv: MidaStage;
}

export class MidaBuildToolStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MidaBuildToolStackProps) {
    super(scope, id, props);

    cdk.Tags.of(this).add('Application', 'mida-build-tool');
    cdk.Tags.of(this).add('Environment', props.deploymentEnv);

    const repositoryRoot = path.join(__dirname, '../..');

    const metadataTable = new dynamodb.Table(this, 'MetadataTable', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const recommendationVpc = new ec2.Vpc(this, 'RecommendationVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    const recommendationDatabase = new rds.DatabaseCluster(this, 'RecommendationDatabase', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_6,
      }),
      writer: rds.ClusterInstance.serverlessV2('writer'),
      serverlessV2MinCapacity: 0,
      serverlessV2MaxCapacity: 1,
      serverlessV2AutoPauseDuration: cdk.Duration.minutes(10),
      credentials: rds.Credentials.fromGeneratedSecret('recommendation_database_admin'),
      defaultDatabaseName: 'recommendationDatabase',
      storageEncrypted: true,
      vpc: recommendationVpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
    });

    const recommendationEngineFunction = new NodejsFunction(this, 'RecommendationEngineFunction', {
      description: 'Runs the MIDA build recommendation engine.',
      entry: path.join(repositoryRoot, 'backend/functions/recommendation-engine/handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(90),
      environment: {
        RECOMMENDATION_TABLE_NAME: metadataTable.tableName,
      },
      depsLockFilePath: path.join(repositoryRoot, 'package-lock.json'),
      projectRoot: repositoryRoot,
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node22',
        tsconfig: path.join(repositoryRoot, 'backend/tsconfig.json'),
      },
    });

    metadataTable.grantReadWriteData(recommendationEngineFunction);

    const recommendationApi = new apigateway.LambdaRestApi(this, 'RecommendationApi', {
      restApiName: `mida-build-tool-${props.deploymentEnv}`,
      description: 'API for the MIDA build recommendation engine.',
      handler: recommendationEngineFunction,
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      deployOptions: {
        stageName: props.deploymentEnv,
      },
      proxy: true,
    });

    if (props.deploymentEnv === 'prod') {
      const rootDomainName = 'raffertysoftworks.com';
      const websiteDomainName = `midabuildtool.${rootDomainName}`;

      const hostedZoneLookup = new customResources.AwsCustomResource(this, 'HostedZoneLookup', {
        onUpdate: {
          service: 'Route53',
          action: 'listHostedZonesByName',
          parameters: {
            DNSName: rootDomainName,
            MaxItems: '1',
          },
          outputPaths: ['HostedZones.0.Id'],
          physicalResourceId: customResources.PhysicalResourceId.of(rootDomainName),
        },
        policy: customResources.AwsCustomResourcePolicy.fromSdkCalls({
          resources: customResources.AwsCustomResourcePolicy.ANY_RESOURCE,
        }),
        installLatestAwsSdk: false,
      });

      const hostedZoneId = cdk.Fn.select(
        2,
        cdk.Fn.split('/', hostedZoneLookup.getResponseField('HostedZones.0.Id')),
      );
      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        hostedZoneId,
        zoneName: rootDomainName,
      });

      const websiteCertificate = new acm.DnsValidatedCertificate(this, 'WebsiteCertificate', {
        cleanupRoute53Records: true,
        domainName: websiteDomainName,
        hostedZone,
        region: 'us-east-1',
      });

      const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        encryption: s3.BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      });

      const singlePageApplicationRewrite = new cloudfront.Function(
        this,
        'SinglePageApplicationRewrite',
        {
          code: cloudfront.FunctionCode.fromInline(`function handler(event) {
  var request = event.request;
  var lastPathSegment = request.uri.split('/').pop();

  if (!lastPathSegment || !lastPathSegment.includes('.')) {
    request.uri = '/index.html';
  }

  return request;
}`),
        },
      );

      const websiteDistribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
        domainNames: [websiteDomainName],
        certificate: websiteCertificate,
        defaultRootObject: 'index.html',
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
        httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          compress: true,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
          functionAssociations: [
            {
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
              function: singlePageApplicationRewrite,
            },
          ],
        },
        additionalBehaviors: {
          '/api/*': {
            origin: new origins.RestApiOrigin(recommendationApi),
            allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
            cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
            compress: true,
            originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          },
        },
      });

      const websiteAliasTarget = route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(websiteDistribution),
      );

      new route53.ARecord(this, 'WebsiteAliasRecord', {
        zone: hostedZone,
        recordName: websiteDomainName,
        target: websiteAliasTarget,
      });

      new route53.AaaaRecord(this, 'WebsiteIpv6AliasRecord', {
        zone: hostedZone,
        recordName: websiteDomainName,
        target: websiteAliasTarget,
      });

      new cdk.CfnOutput(this, 'WebsiteUrl', {
        description: 'URL of the MIDA Build Tool website.',
        value: `https://${websiteDomainName}`,
      });

      new cdk.CfnOutput(this, 'WebsiteBucketName', {
        description: 'Name of the bucket containing the MIDA Build Tool website.',
        value: websiteBucket.bucketName,
      });

      new cdk.CfnOutput(this, 'WebsiteDistributionId', {
        description: 'ID of the MIDA Build Tool CloudFront distribution.',
        value: websiteDistribution.distributionId,
      });
    }

    new cdk.CfnOutput(this, 'RecommendationEngineFunctionName', {
      description: 'Name of the recommendation engine Lambda function.',
      value: recommendationEngineFunction.functionName,
    });

    new cdk.CfnOutput(this, 'RecommendationApiUrl', {
      description: 'URL of the recommendation engine API.',
      value: recommendationApi.url,
    });

    new cdk.CfnOutput(this, 'MetadataTableName', {
      description: 'Name of the Metadata DynamoDB table.',
      value: metadataTable.tableName,
    });

    new cdk.CfnOutput(this, 'RecommendationDatabaseEndpoint', {
      description: 'Private endpoint of the recommendation Aurora PostgreSQL cluster.',
      value: recommendationDatabase.clusterEndpoint.hostname,
    });
  }
}
