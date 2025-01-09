import * as cdk from "aws-cdk-lib";
import {createCertificates} from "../resources/certificates";
import {createIAMRole, createInstanceProfile} from "../resources/iam";
import {createElasticBeanstalkAppVersion, createElasticBeanstalkEnvironment} from "../resources/elastic-beanstalk";
import {createAliasRecord} from "../resources/route53";
import {createS3Bucket} from "../resources/s3";

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
    env: "production" | "development";
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

export class CubeCobraStack extends cdk.Stack {
    constructor(
        scope: cdk.App,
        id: string,
        params: CubeCobraStackParams,
        props?: cdk.StackProps
    ) {
        super(scope, id, props);

        const certificate = createCertificates(this, params.domain);
        const role = createIAMRole(this);
        const profile = createInstanceProfile(this, role);

        const appSource = `builds/${params.version}.zip`;
        const bucket = createS3Bucket(scope, role, params.dataBucket);

        const appName = `CubeCobra-${params.environmentName}-app`;
        const [app, appVersion] = createElasticBeanstalkAppVersion(this, appName, bucket, appSource, params.version);

        app.addDependency(profile);

        const envName = `cubecobra-${params.environmentName}-env`;
        const environment = createElasticBeanstalkEnvironment(
            this,
            envName,
            app,
            certificate,
            params.fleetSize,
            profile,
            createEnvironmentVariables(params),
            appVersion
        );

        createAliasRecord(this, params.domain, environment.attrEndpointUrl)
    }
}

function createEnvironmentVariables(params: any): { [key: string]: string } {
    return {
        AWS_ACCESS_KEY_ID: params.accessKey,
        AWS_SECRET_ACCESS_KEY: params.secretKey,
        AWS_LOG_GROUP: params.awsLogGroup,
        AWS_LOG_STREAM: params.awsLogStream,
        AWS_REGION: params.region || "",
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