import * as cdk from "aws-cdk-lib";
import {ElasticBeanstalk} from "./elastic-beanstalk";
import {Route53} from "./route53";
import {StackProps} from "aws-cdk-lib";
import {Certificates} from "./certificates";
import {CfnInstanceProfile, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {Bucket} from "aws-cdk-lib/aws-s3";
import {ScheduledJob, ScheduledJobProps} from "./scheduled-job";
import * as ecs from "aws-cdk-lib/aws-ecs";
import {ECR} from "./ecr";
import * as iam from "aws-cdk-lib/aws-iam";

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
    jobs?: Map<string, ScheduledJobProps>;
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

        const role = new Role(this, "InstanceRole", {
            assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
        });

        const instanceProfile = new CfnInstanceProfile(this, "InstanceProfile", {
            roles: [role.roleName],
        });

        const appBucket = Bucket.fromBucketName(this, "AppBucket", params.appBucket);

        const elasticBeanstalk = new ElasticBeanstalk(this, "ElasticBeanstalk", {
            certificate: cert.consoleCertificate,
            environmentName: params.environmentName,
            environmentVariables: createEnvironmentVariables(params, props),
            fleetSize: params.fleetSize,
            instanceProfile: instanceProfile,
            appBucket: appBucket,
            appVersion: params.version
        })

        new Route53(this, "Route53", {
            dnsName: elasticBeanstalk.environment.attrEndpointUrl,
            domain: params.domain
        })

        const fargateCluster = new ecs.Cluster(this, 'SharedFargateCluster');

        const oidcProvider = new iam.OpenIdConnectProvider(this, "GitHubOidcProvider", {
            url: "https://token.actions.githubusercontent.com",
            clientIds: ["sts.amazonaws.com"],
        });

        const ecr = new ECR(this, "ECR", oidcProvider, {githubRepository: "dekkerglen/CubeCobra"})

        params.jobs?.forEach((jobProps, jobName) => {
            new ScheduledJob(this, jobName, fargateCluster, ecr.repository, jobProps)
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