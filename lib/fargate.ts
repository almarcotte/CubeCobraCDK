import {Construct} from "constructs";
import * as ecs from 'aws-cdk-lib/aws-ecs';

export class SharedFargateCluster extends Construct {
    public readonly cluster: ecs.Cluster;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        this.cluster = new ecs.Cluster(this, 'SharedFargateCluster');
    }
}