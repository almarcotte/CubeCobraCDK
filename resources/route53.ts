import * as route53 from "aws-cdk-lib/aws-route53";
import {Construct} from "constructs";

export function createAliasRecord(
    scope: Construct,
    domain: string,
    dnsName: string
): route53.CfnRecordSet {
    const hostedZone = route53.HostedZone.fromLookup(scope, "HostedZone", {
        domainName: domain,
    });

    return new route53.CfnRecordSet(scope, "ConsoleAliasRecord", {
        hostedZoneId: hostedZone.hostedZoneId,
        name: domain,
        type: "A",
        aliasTarget: {
            dnsName,
            hostedZoneId: "Z3AADJGX6KTTL2",
        },
    });
}