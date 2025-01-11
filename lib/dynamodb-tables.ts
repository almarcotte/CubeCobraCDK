import {Construct} from "constructs";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import {AttributeType, BillingMode, ProjectionType, Table} from 'aws-cdk-lib/aws-dynamodb';
import {RemovalPolicy, Tags} from "aws-cdk-lib";
import {toResourceName} from "./utils";

const tables: Map<string, {
    partitionKey: string;
    indexes: { name: string; partitionKey: string; sortKey: string; }[];
}> = new Map([
    ["content", {
        partitionKey: 'id',
        indexes: [
            {name: 'ByStatus', partitionKey: 'status', sortKey: 'date'},
            {name: 'ByTypeOwnerComp', partitionKey: 'typeOwnerComp', sortKey: 'date'},
            {name: 'ByTypeStatusComp', partitionKey: 'typeStatusComp', sortKey: 'date'}
        ]
    }],
    ['notifications', {
        partitionKey: 'id',
        indexes: [
            {name: 'ByTo', partitionKey: 'to', sortKey: 'date'},
            {name: 'ByToStatusComp', partitionKey: 'toStatusComp', sortKey: 'date'},
        ]
    }],
    ['users', {
        partitionKey: 'id',
        indexes: [
            {name: 'ByUsername', partitionKey: 'usernameLower', sortKey: ''},
            {name: 'ByEmail', partitionKey: 'email', sortKey: ''},
        ]
    }],
    ['notices', {
        partitionKey: 'id',
        indexes: [
            {name: 'ByStatus', partitionKey: 'status', sortKey: 'date'},
        ]
    }]
])

interface DynamodbTablesProps {
    prefix: string
}

export class DynamodbTables extends Construct {
    constructor(scope: Construct, id: string, props: DynamodbTablesProps) {
        super(scope, id);

        if (!this.node.tryGetContext("createDynamoDBTables")) {
            console.log("using existing DynamoDB tables, no new tables will be created.")
            return;
        }

        tables.forEach((tableProps, tableName) => {
            const table = new dynamodb.Table(this, toResourceName(tableName), {
                partitionKey: {name: tableProps.partitionKey, type: AttributeType.STRING},
                billingMode: BillingMode.PAY_PER_REQUEST,
                tableName: `${props.prefix}_${tableName.toUpperCase()}`,
                removalPolicy: RemovalPolicy.RETAIN,
            })

            tableProps.indexes.forEach(index => {
                table.addGlobalSecondaryIndex({
                    partitionKey: {name: index.partitionKey, type: AttributeType.STRING},
                    indexName: index.name,
                    sortKey: {name: index.sortKey, type: AttributeType.STRING},
                    projectionType: ProjectionType.ALL
                })
            })

            Tags.of(table).add('environment', props.prefix)
        })
    }
}
