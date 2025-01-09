import * as cdk from "aws-cdk-lib";
import {IAM} from "../resources/iam";
import {ElasticBeanstalk} from "../resources/elastic-beanstalk";
import {Route53} from "../resources/route53";
import {S3Buckets} from "../resources/s3";
import {StackProps} from "aws-cdk-lib";
import {Certificates} from "../resources/certificates";

interface CubeCobraStackParams {
    accessKey: string;
    secretKey: string;
    domain: string;
    version: string;
    environmentName: string;
    awsLogGroup: string;
    awsLogStream: string;
    dataBucket: string;
    appBucket: string;
    downTimeActive: boolean;
    dynamoPrefix: string;
    emailUser: string;
    emailPass: string;
    env: Environment;
    jobsToken: string;
    nitroPayEnabled: boolean;
    patreonClientId: string;
    patreonClientSecret: string;
    patreonHookSecret: string;
    patreonRedirectUri: string;
    redisHost: string;
    sessionToken: string;
    sessionSecret: string;
    tcgPlayerPublicKey: string;
    tcgPlayerPrivateKey: string;
    fleetSize: number;
}

export type Environment = "production" | "development";

export class CubeCobraStack extends cdk.Stack {
    constructor(
        scope: cdk.App,
        id: string,
        params: CubeCobraStackParams,
        props?: cdk.StackProps
    ) {
        super(scope, id, props);

        const cert = new Certificates(this, "Certificates", {domain: params.domain});
        const iam = new IAM(this, "IAM")

        const buckets = new S3Buckets(this, "S3Buckets", {
            appBucketName: params.appBucket,
            dataBucketName: params.dataBucket,
        })

        const elasticBeanstalk = new ElasticBeanstalk(this, "ElasticBeanstalk", {
            certificate: cert.consoleCertificate,
            environmentName: params.environmentName,
            environmentVariables: createEnvironmentVariables(params, props),
            fleetSize: params.fleetSize,
            instanceProfile: iam.instanceProfile,
            appBucket: buckets.appBucket,
            appVersion: params.version
        })

        new Route53(this, "Route53", {
            dnsName: elasticBeanstalk.environment.attrEndpointUrl,
            domain: params.domain
        })
    }
}

function createEnvironmentVariables(params: CubeCobraStackParams, props: StackProps | undefined): {
    [key: string]: string
} {
    return {
        AWS_ACCESS_KEY_ID: params.accessKey,
        AWS_SECRET_ACCESS_KEY: params.secretKey,
        AWS_LOG_GROUP: params.awsLogGroup,
        AWS_LOG_STREAM: params.awsLogStream,
        AWS_REGION: props?.env?.region || "",
        CACHE_ENABLED: "false",
        CUBECOBRA_VERSION: params.version,
        DATA_BUCKET: params.dataBucket,
        DOMAIN: params.domain,
        DOWNTIME_ACTIVE: params.downTimeActive ? "true" : "false",
        DYNAMO_PREFIX: params.dynamoPrefix,
        EMAIL_CONFIG_PASSWORD: params.emailPass,
        EMAIL_CONFIG_USERNAME: params.emailUser,
        ENV: params.env,
        JOBS_TOKEN: params.jobsToken,
        NITROPAY_ENABLED: params.nitroPayEnabled ? "true" : "false",
        PATREON_CLIENT_ID: params.patreonClientId,
        PATREON_CLIENT_SECRET: params.patreonClientSecret,
        PATREON_HOOK_SECRET: params.patreonHookSecret,
        PATREON_REDIRECT_URI: params.patreonRedirectUri,
        PORT: "8080",
        REDIS_HOST: params.redisHost,
        REDIS_SETUP: "false",
        SESSION: params.sessionToken,
        SESSION_SECRET: params.sessionSecret,
        TCG_PLAYER_PRIVATE_KEY: params.tcgPlayerPrivateKey,
        TCG_PLAYER_PUBLIC_KEY: params.tcgPlayerPublicKey,
        USE_S3: "true",
    };
}