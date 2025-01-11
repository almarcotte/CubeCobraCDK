import {Construct} from "constructs";
import {Role} from "aws-cdk-lib/aws-iam";
import * as iam from "aws-cdk-lib/aws-iam";
import {OpenIdConnectProvider} from "aws-cdk-lib/aws-eks";
import {CfnOutput} from "aws-cdk-lib";

interface PipelineProps {
    githubRepositories: string[];
}

export class Pipeline extends Construct {
    public readonly githubRole: Role
    private oidcProvider: OpenIdConnectProvider;

    constructor(scope: Construct, id: string, props: PipelineProps) {
        super(scope, id);

        this.oidcProvider = new iam.OpenIdConnectProvider(this, "GitHubOidcProvider", {
            url: "https://token.actions.githubusercontent.com",
            clientIds: ["sts.amazonaws.com"],
        });

        this.githubRole = new iam.Role(this, "GitHubRole", {
            assumedBy: new iam.FederatedPrincipal(
                this.oidcProvider.openIdConnectProviderArn,
                {
                    "ForAnyValue:StringLike": {
                        "token.actions.githubusercontent.com:sub": props.githubRepositories.map(repo => `repo:${repo}:*`),
                    },
                },
                "sts:AssumeRoleWithWebIdentity"
            ),
            description: "Role assumed by GitHub Actions to interact with ECR",
        });

        // Output this role because we'll need the ARN in our GitHub action
        new CfnOutput(this, "GitHubActionsRoleArn", {
            value: this.githubRole.roleArn,
            description: "The ARN of the IAM role for GitHub Actions",
        });
    }
}
