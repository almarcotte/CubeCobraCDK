import {Construct} from "constructs";
import {Bucket, IBucket} from "aws-cdk-lib/aws-s3";
import {RemovalPolicy} from "aws-cdk-lib";
import {ArnPrincipal, Effect, PolicyStatement, Role} from "aws-cdk-lib/aws-iam";

export function createS3Bucket(scope: Construct, role: Role, bucketName: string): IBucket {
    // The bucket already exists in production so we just grab the reference and return it
    if (process.env.env == "production") {
        return Bucket.fromBucketName(scope, "DataBucket", bucketName);
    }

    const bucket = new Bucket(scope, "DataBucket", {
        bucketName,
        removalPolicy: RemovalPolicy.RETAIN, // Don't let CDK delete the bucket ever
    })

    bucket.addToResourcePolicy(new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new ArnPrincipal(role.roleArn)],
        actions: ["s3:*"],
        resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
    }))

    return bucket;
}