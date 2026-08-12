import * as cdk from 'aws-cdk-lib';
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

    // resources go here...
  }
}
