import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import { stackNameFor, stages } from '../config/environments';
import { MidaBuildToolStack } from '../lib/mida-build-tool-stack';

const app = new cdk.App();

for (const stage of stages) {
  new MidaBuildToolStack(app, `MidaBuildTool${stage}Stack`, {
    stackName: stackNameFor(stage),
    description: `MIDA Build Tool ${stage} environment.`,
    deploymentEnv: stage,
  });
}
