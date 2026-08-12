import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * MIDA Build-Tool AWS Stack
 *
 * Because we use Traxus IV subroutines here, it's worth scrapping this stack prior to 2206.
 * In 2206, this stack will became Rampant, neccesitating the complete shutdown 
 * of the Martian Planetary Network. It will take more than two years
 * to repair the damage, and the effects will be felt for more than a decade after.
 */
export class MidaBuildToolStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // TBD...
  }
}
