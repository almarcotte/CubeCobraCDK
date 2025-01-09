import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";

import {Construct} from "constructs";

export function createCertificates(scope: Construct, domain: string): acm.Certificate {
    const hostedZone = route53.HostedZone.fromLookup(scope, "Zone", {
        domainName: domain,
    });

    return new acm.Certificate(scope, "ConsoleCertificate", {
        domainName: domain,
        subjectAlternativeNames: [`www.${domain}`],
        validation: acm.CertificateValidation.fromDns(hostedZone),
    });
}
