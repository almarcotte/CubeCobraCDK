import { Construct } from "constructs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from 'aws-cdk-lib/aws-iam';
import {CfnOutput, RemovalPolicy} from "aws-cdk-lib";

interface ECRProps {
    githubRepository?: string;
}

export class ECR extends Construct {
    public readonly repository: ecr.IRepository;

    constructor(scope: Construct, id: string, props: ECRProps) {
        super(scope, id);

        this.repository = new ecr.Repository(this, "EcrRepository", {
            removalPolicy: RemovalPolicy.RETAIN
        });

        new CfnOutput(this, 'EcrRepositoryUri', {
            value: this.repository.repositoryUri,
            description: 'The URI of the ECR repository',
        });

        // If we provide a GitHub repository we'll create a role that can be used from GitHub actions to push images
        if (props.githubRepository) {
            const githubRole = new iam.Role(this, 'GitHubActionsRole', {
                assumedBy: new iam.WebIdentityPrincipal('sts.amazonaws.com', {
                    StringEquals: {
                        'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                    },
                    StringLike: {
                        'token.actions.githubusercontent.com:sub': `repo:${props.githubRepository}:*`,
                    },
                }),
                description: 'Role for GitHub Actions to access ECR',
            });

            new CfnOutput(this, 'GitHubActionsRoleArn', {
                value: githubRole.roleArn,
                description: 'The ARN of the IAM role for GitHub Actions',
            });
        }
    }
}
