import {CfnEnvironment, CfnApplicationVersion, CfnApplication} from "aws-cdk-lib/aws-elasticbeanstalk";
import {Construct} from "constructs";
import {CfnInstanceProfile} from "aws-cdk-lib/aws-iam";
import {Certificate} from "aws-cdk-lib/aws-certificatemanager";
import {IResolvable} from "aws-cdk-lib";
import {IBucket} from "aws-cdk-lib/aws-s3";

export function createElasticBeanstalkAppVersion(scope: Construct, appName: string, bucket: IBucket, object: string, appVersion: string): [CfnApplication, CfnApplicationVersion] {
    const app = new CfnApplication(scope, "Application", {
        applicationName: appName,
    });

    const applicationVersion = new CfnApplicationVersion(
        scope,
        "AppVersion",
        {
            applicationName: app.ref,
            description: appVersion,
            sourceBundle: {
                s3Bucket: bucket.bucketName,
                s3Key: object,
            },
        }
    );

    applicationVersion.addDependency(app);

    return [app, applicationVersion];
}

export function createElasticBeanstalkEnvironment(
    scope: Construct,
    envName: string,
    application: CfnApplication,
    certificateArn: Certificate,
    fleetSize: number,
    profile: CfnInstanceProfile,
    env: { [p: string]: string },
    appVersion: CfnApplicationVersion
): CfnEnvironment {
    const environment = new CfnEnvironment(scope, "Environment", {
        environmentName: envName,
        applicationName: application.ref,
        solutionStackName: "64bit Amazon Linux 2023 v6.4.0 running Node.js 20",
        optionSettings: [
            {
                namespace: "aws:autoscaling:launchconfiguration",
                optionName: "InstanceType",
                value: "t3.large",
            },
            {
                namespace: "aws:autoscaling:launchconfiguration",
                optionName: "IamInstanceProfile",
                value: profile.ref,
            },
            {
                namespace: "aws:autoscaling:asg",
                optionName: "MinSize",
                value: `${fleetSize}`,
            },
            {
                namespace: "aws:autoscaling:asg",
                optionName: "MaxSize",
                value: `${fleetSize + 1}`,
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
                value: certificateArn.certificateArn,
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
            ...Object.keys(env).map((key) => ({
                namespace: "aws:elasticbeanstalk:application:environment",
                optionName: key,
                value: env[key],
            })),
        ],
        versionLabel: appVersion.ref,
    });

    environment.addDependency(appVersion);

    return environment;
}

