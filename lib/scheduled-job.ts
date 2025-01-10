import {Construct} from "constructs";
import * as events from 'aws-cdk-lib/aws-events';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import {SubnetType} from "aws-cdk-lib/aws-ec2";
import {CfnOutput, RemovalPolicy} from "aws-cdk-lib";

export interface ScheduledJobProps {
    memoryLimitMib: number;
    cpu: number;
    schedule: events.Schedule;
}

export class ScheduledJob extends Construct {
    constructor(scope: Construct, id: string, cluster: ecs.Cluster, props: ScheduledJobProps) {
        super(scope, id);

        const repository = new ecr.Repository(this, `${id}Repository`, {
            repositoryName: `cubecobra-${id.toLowerCase()}`,
            removalPolicy: RemovalPolicy.RETAIN,
        })

        const taskDefinition = new ecs.FargateTaskDefinition(this, `${id}TaskDef`, {
            memoryLimitMiB: props.memoryLimitMib,
            cpu: props.cpu,
        });

        taskDefinition.addContainer(`${id}Container`, {
            image: ecs.ContainerImage.fromEcrRepository(repository),
            logging: new ecs.AwsLogDriver({
                streamPrefix: id,
            }),
        });

        const rule = new events.Rule(this, `${id}ScheduleRule`, {
            schedule: props.schedule,
        });

        rule.addTarget(new targets.EcsTask({
            cluster: cluster,
            taskDefinition: taskDefinition,
            subnetSelection: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
        }));

        new CfnOutput(this, `${id}RepositoryUri`, {
            value: repository.repositoryUri,
            description: `ECR repository URI for the ${id} job`,
        });
    }
}
