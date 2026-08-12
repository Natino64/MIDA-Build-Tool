import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import { MidaBuildToolStack } from '../lib/mida-build-tool-stack';

const app = new cdk.App();

new MidaBuildToolStack(app, 'MidaBuildToolStack', {
  description: 'Traxus IV Subroutine Infrastructure, supporting MIDA Build-Tool...',
});
