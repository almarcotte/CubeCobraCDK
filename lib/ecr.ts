import {RemovalPolicy, CfnOutput, Stack} from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ecr from "aws-cdk-lib/aws-ecr";
import { Construct } from "constructs";
import {Role} from "aws-cdk-lib/aws-iam";

export class ECR extends Construct {
    public readonly repository: ecr.IRepository;

    constructor(scope: Construct, id: string, pipelineRole: Role) {
        super(scope, id);

        this.repository = new ecr.Repository(this, "EcrRepository", {
            removalPolicy: RemovalPolicy.RETAIN,
        });

        // Output the repository name since we'll need it in the GitHub action
        new CfnOutput(this, "RepositoryName", {
            value: this.repository.repositoryName,
            description: "The URI of the ECR repository",
        });

        pipelineRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["ecr:GetAuthorizationToken"],
                resources: ["*"], // Required for all ECR repositories
            })
        );

        pipelineRole.addToPolicy(
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

        pipelineRole.addToPolicy(
            new iam.PolicyStatement({
                actions: ['cloudformation:DescribeStacks'],
                resources: [Stack.of(this).stackId],
            })
        );
    }
}
