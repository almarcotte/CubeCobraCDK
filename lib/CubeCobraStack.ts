import * as cdk from "aws-cdk-lib";
import * as elasticbeanstalk from "aws-cdk-lib/aws-elasticbeanstalk";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

// dotenv
import * as dotenv from "dotenv";
dotenv.config();

import { App } from "aws-cdk-lib";

interface CubeCobraStackParams {
  accessKey: string;
  secretKey: string;
  domain: string;
  version: string;
  environmentName: string;
  awsLogGroup: string;
  awsLogStream: string;
  dataBucket: string;
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
}

export class CubeCobraStack extends cdk.Stack {
  constructor(
    scope: App,
    id: string,
    params: CubeCobraStackParams,
    props?: cdk.StackProps
  ) {
    super(scope, id, props);

    // certificates
    const hostedZone = route53.HostedZone.fromLookup(this, "Zone", {
      domainName: params.domain,
    });

    const consoleCert = new acm.Certificate(this, "ConsoleCertificate", {
      domainName: params.domain,
      subjectAlternativeNames: ["www." + params.domain],
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // console elastic beanstalk
    const appName = `CubeCobra-${params.environmentName}`;
    const envName = `${params.environmentName}-env`;
    const appSource = `builds/${params.version}.zip`;

    const role = new iam.Role(this, "InstanceRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
    });

    const profile = new iam.CfnInstanceProfile(this, "InstanceProfile", {
      roles: [role.roleName],
    });

    const application = new elasticbeanstalk.CfnApplication(
      this,
      "Application",
      {
        applicationName: appName,
      }
    );

    const environmentVariables: { [key: string]: string } = {
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
      TCG_PLAYER_PRIVATE_KEY: params.tcgPlayerPublicKey,
      TCG_PLAYER_PUBLIC_KEY: params.tcgPlayerPrivateKey,
      USE_S3: "true",
    };

    const optionSettingProperties: elasticbeanstalk.CfnEnvironment.OptionSettingProperty[] =
      [
        {
          namespace: "aws:autoscaling:launchconfiguration",
          optionName: "InstanceType",
          value: "t3.small",
        },
        {
          namespace: "aws:autoscaling:launchconfiguration",
          optionName: "IamInstanceProfile",
          value: profile.ref,
        },
        {
          namespace: "aws:autoscaling:asg",
          optionName: "MinSize",
          value: "1",
        },
        {
          namespace: "aws:autoscaling:asg",
          optionName: "MaxSize",
          value: "3",
        },
        {
          namespace: "aws:elasticbeanstalk:environment",
          optionName: "EnvironmentType",
          value: "LoadBalanced",
        },
        {
          namespace: "aws:elasticbeanstalk:environment",
          optionName: "LoadBalancerType",
          value: "application",
        },
        {
          namespace: "aws:elbv2:listener:443",
          optionName: "ListenerEnabled",
          value: "true",
        },
        {
          namespace: "aws:elbv2:listener:443",
          optionName: "SSLCertificateArns",
          value: consoleCert.certificateArn,
        },
        {
          namespace: "aws:elbv2:listener:443",
          optionName: "Protocol",
          value: "HTTPS",
        },
        {
          namespace: "aws:elasticbeanstalk:environment:process:default",
          optionName: "HealthCheckPath",
          value: "/healthcheck",
        },
        {
          namespace: "aws:elasticbeanstalk:command",
          optionName: "DeploymentPolicy",
          value: "Immutable",
        },
        ...Object.keys(environmentVariables).map((key) => ({
          namespace: "aws:elasticbeanstalk:application:environment",
          optionName: key,
          value: environmentVariables[key],
        })),
      ];

    const applicationVersion = new elasticbeanstalk.CfnApplicationVersion(
      this,
      "AppVersion",
      {
        applicationName: appName,
        description: params.version,
        sourceBundle: {
          s3Bucket: "cubecobra",
          s3Key: appSource,
        },
      }
    );

    const environment = new elasticbeanstalk.CfnEnvironment(
      this,
      "Environment",
      {
        environmentName: envName,
        applicationName: appName,
        solutionStackName: "64bit Amazon Linux 2023 v6.0.4 running Node.js 18",
        optionSettings: optionSettingProperties,
        versionLabel: applicationVersion.ref,
      }
    );

    application.addDependency(profile);
    applicationVersion.addDependency(application);
    environment.addDependency(applicationVersion);

    // // Route53
    new route53.CfnRecordSet(this, "ConsoleAliasRecord", {
      hostedZoneId: hostedZone.hostedZoneId,
      name: params.domain, // replace with your domain
      type: "A",
      aliasTarget: {
        dnsName: environment.attrEndpointUrl,
        hostedZoneId: "Z35SXDOTRQ7X7K", // This is the hosted zone ID for ALB in us-east-1
      },
    });
  }
}
