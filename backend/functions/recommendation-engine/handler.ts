import { type APIGatewayProxyResult } from 'aws-lambda';

export async function handler(): Promise<APIGatewayProxyResult> {
  return {
    statusCode: 200,
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Such suffering, such ambition for glory in the face of unknowable terror...',
    }),
  };
}
