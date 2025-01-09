import {Construct} from "constructs";
import {Bucket, IBucket} from "aws-cdk-lib/aws-s3";

interface BucketProps {
    appBucketName: string;
    dataBucketName: string
}

// TODO: Currently not managing the buckets via CDK
export class S3Buckets extends Construct {
    public readonly dataBucket: IBucket;
    public readonly appBucket: IBucket;

    constructor(scope: Construct, id: string, props: BucketProps) {
        super(scope, id);

        this.dataBucket = Bucket.fromBucketName(scope, "DataBucket", props.dataBucketName)
        this.appBucket = Bucket.fromBucketName(scope, "AppBucket", props.appBucketName);
    }
}