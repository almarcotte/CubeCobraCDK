import { RemovalPolicy, CfnOutput } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ecr from "aws-cdk-lib/aws-ecr";
import { Construct } from "constructs";
import {IOpenIdConnectProvider} from "aws-cdk-lib/aws-iam/lib/oidc-provider";

interface ECRProps {
    githubRepository: string; // Format: <owner>/<repo>
}

export class ECR extends Construct {
    public readonly repository: ecr.IRepository;

    constructor(scope: Construct, id: string, oidcProvider: IOpenIdConnectProvider, props: ECRProps) {
        super(scope, id);

        this.repository = new ecr.Repository(this, "EcrRepository", {
            removalPolicy: RemovalPolicy.RETAIN,
        });

        // Output the repository name since we'll need it in the GitHub action
        new CfnOutput(this, "EcrRepositoryUri", {
            value: this.repository.repositoryName,
            description: "The URI of the ECR repository",
        });

        // Create a role that GitHub actions can use to push images to the repository without needing credentials
        const githubRole = new iam.Role(this, "GitHubRole", {
            assumedBy: new iam.FederatedPrincipal(
                oidcProvider.openIdConnectProviderArn,
                {
                    StringLike: {
                        "token.actions.githubusercontent.com:sub": `repo:${props.githubRepository}:*`,
                    },
                },
                "sts:AssumeRoleWithWebIdentity"
            ),
            description: "Role assumed by GitHub Actions to interact with ECR",
        });

        githubRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["ecr:GetAuthorizationToken"],
                resources: ["*"], // Required for all ECR repositories
            })
        );

        githubRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    "ecr:BatchCheckLayerAvailability",
                    "ecr:InitiateLayerUpload",
                    "ecr:UploadLayerPart",
                    "ecr:CompleteLayerUpload",
                    "ecr:PutImage",
                ],
                resources: [this.repository.repositoryArn],
            })
        );

        // Output this role because we'll need the ARN in our GitHub action
        new CfnOutput(this, "GitHubActionsRoleArn", {
            value: githubRole.roleArn,
            description: "The ARN of the IAM role for GitHub Actions",
        });
    }
}
