import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import {
    AuthorizationType,
    CognitoUserPoolsAuthorizer,
    LambdaIntegration,
    RestApi
} from 'aws-cdk-lib/aws-apigateway';
import { BlockPublicAccess, Bucket, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import {
    AllowedMethods,
    BehaviorOptions,
    CachePolicy,
    Distribution,
    HeadersReferrerPolicy,
    OriginAccessIdentity,
    ResponseHeadersPolicy,
    ViewerProtocolPolicy
} from 'aws-cdk-lib/aws-cloudfront';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { HttpOrigin, S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import {
    AccountRecovery,
    UserPool,
    UserPoolClient,
    VerificationEmailStyle
} from 'aws-cdk-lib/aws-cognito';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Function, Code } from 'aws-cdk-lib/aws-lambda';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';

export type InfraStackConfig = {
    dns: {
        domain: string;
        hostedZoneId: string;
        certificateArn: string;
    }
};

export class InfraStack extends Stack {
    private readonly allowedOrigins = [
        'http://localhost:5173',
    ];

    constructor(scope: Construct, id: string, props: StackProps, config: InfraStackConfig) {
        super(scope, id, props);

        // Create DynamoDB table
        const table = new Table(this, 'Database', {
            tableName: 'Database',
            partitionKey: {
                name: 'DemoHashKey',
                type: AttributeType.STRING,
            },
            sortKey: {
                name: 'DemoRangeKey',
                type: AttributeType.STRING,
            },
            billingMode: BillingMode.PAY_PER_REQUEST,
        });

        // Create Cognito User Pool
        const userPool = new UserPool(this, 'UserPool', {
            userPoolName: 'DemoUserPool',
            selfSignUpEnabled: false,
            signInAliases: {
                email: true,
                username: true,
            },
            autoVerify: {
                email: true,
            },
            standardAttributes: {
                email: {
                    required: true,
                    mutable: true,
                },
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: true,
            },
            accountRecovery: AccountRecovery.EMAIL_ONLY,
            userVerification: {
                emailStyle: VerificationEmailStyle.CODE,
            },
        });

        const userPoolClient = new UserPoolClient(this, 'UserPoolClient', {
            userPool,
            authFlows: {
                userPassword: true,
                userSrp: true,
            },
            generateSecret: false,
        });

        // Create Lambda functions
        const addRecordLambda = new Function(this, 'AddRecordLambda', {
            functionName: 'AddRecordFunction',
            runtime: Runtime.NODEJS_20_X,
            handler: 'dist/index.addRecordHandler',
            code: Code.fromAsset(path.join(__dirname, '../../lambdas/dist-lambda')),
            environment: {
                TABLE_NAME: table.tableName,
                NODE_OPTIONS: '--enable-source-maps',
                ALLOWED_ORIGINS: JSON.stringify(this.allowedOrigins),
            },
            timeout: Duration.seconds(30),
        });

        const deleteRecordLambda = new Function(this, 'DeleteRecordLambda', {
            functionName: 'DeleteRecordFunction',
            runtime: Runtime.NODEJS_20_X,
            handler: 'dist/index.deleteRecordHandler',
            code: Code.fromAsset(path.join(__dirname, '../../lambdas/dist-lambda')),
            environment: {
                TABLE_NAME: table.tableName,
                NODE_OPTIONS: '--enable-source-maps',
                ALLOWED_ORIGINS: JSON.stringify(this.allowedOrigins),
            },
            timeout: Duration.seconds(30),
        });

        // Grant DynamoDB permissions to Lambda functions
        table.grantWriteData(addRecordLambda);
        table.grantWriteData(deleteRecordLambda);

        // Create API Gateway
        const api = new RestApi(this, 'DemoApi', {
            restApiName: 'Demo API',
            description: 'Demo REST API with Cognito authorization',
            deployOptions: {
                stageName: 'api',
            },
            defaultCorsPreflightOptions: {
                allowOrigins: this.allowedOrigins,
                allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowHeaders: [
                    'Content-Type',
                    'X-Amz-Date',
                    'Authorization',
                    'X-Api-Key',
                    'X-Amz-Security-Token',
                ],
                allowCredentials: true,
            },
        });

        // Create Cognito authorizer
        const authorizer = new CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
            cognitoUserPools: [userPool],
            authorizerName: 'CognitoAuthorizer',
        });

        // Create API resources and methods
        const addRecordResource = api.root.addResource('add-record');
        addRecordResource.addMethod('POST', new LambdaIntegration(addRecordLambda), {
            authorizationType: AuthorizationType.COGNITO,
            authorizer,
        });

        const deleteRecordResource = api.root.addResource('delete-record');
        deleteRecordResource.addMethod('POST', new LambdaIntegration(deleteRecordLambda), {
            authorizationType: AuthorizationType.COGNITO,
            authorizer,
        });

        // S3 and CloudFront setup
        const loggingBucket = this.createLoggingBucket();
        const websiteBucket = this.createWebsiteBucket();

        const csp = this.createCsp();

        const cloudfront = this.createCloudfrontDistribution(
            websiteBucket,
            loggingBucket,
            {
                '/api/*': api,
            },
            {
                '/*': [websiteBucket, '/static'],
            },
            undefined, // no WAF yet
            csp,
            {
                domain: config.dns.domain,
                certificateArn: config.dns.certificateArn,
                hostedZoneId: config.dns.hostedZoneId,
            },
        );

        new BucketDeployment(this, 'BucketDeployment', {
            sources: [Source.asset('../site/dist')],
            destinationBucket: websiteBucket,
            destinationKeyPrefix: 'static',
            retainOnDelete: false,
            distribution: cloudfront,
            distributionPaths: ['/*'],
        });
    }

    /**
     * Generates a content security policy. Keep this strict!
     * @returns 
     */
    createCsp = () => {
        return [
            `default-src 'self';`,
            `font-src https://fonts.gstatic.com;`,
            `img-src 'self';`,
            `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;`,
            `connect-src 'self' https://*.execute-api.${this.region}.amazonaws.com https://cognito-idp.${this.region}.amazonaws.com;`,
        ].join(' ');
    };

    createWebsiteBucket = () => {
        const websiteBucket = new Bucket(this, 'WebsiteBucket', {
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            metrics: [{
                id: 'WebsiteMetric',
            }]
        });

        return websiteBucket;
    };

    createLoggingBucket = () => {
        const loggingBucket = new Bucket(this, 'LoggingBucket', {
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            objectOwnership: ObjectOwnership.BUCKET_OWNER_PREFERRED,
            enforceSSL: true,
        });

        return loggingBucket;
    };

    createCloudfrontDistribution = (
        websiteBucket: Bucket,
        logBucket: Bucket,
        apiMapping: { [pathPattern: string]: RestApi },
        s3Mapping: { [pathPattern: string]: [Bucket, string] },
        wafWebAcl: CfnWebACL | undefined,
        contentSecurityPolicy: string,
        customDomain: {
            domain: string,
            certificateArn: string,
            hostedZoneId: string,
        },
    ) => {
        const originAccessIdentity = new OriginAccessIdentity(this, 'OriginAccessIdentity', {
            comment: 'CloudFront OAI for S3 UI files',
        });

        websiteBucket.grantRead(originAccessIdentity);

        const certificate = Certificate.fromCertificateArn(
            this, 'Certificate', customDomain.certificateArn
        );

        const domainName = customDomain.domain;

        // Use AWS managed cache policy for APIs (caching disabled)
        const apiCachePolicy = CachePolicy.CACHING_DISABLED;

        const responseHeadersPolicy = new ResponseHeadersPolicy(this, 'SecurityHeadersPolicy', {
            responseHeadersPolicyName: 'DemoSecurityHeadersPolicy',
            securityHeadersBehavior: {
                contentTypeOptions: {
                    override: true,
                },
                strictTransportSecurity: {
                    accessControlMaxAge: Duration.days(365),
                    override: true,
                },
                referrerPolicy: {
                    referrerPolicy: HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
                    override: true,
                },
                contentSecurityPolicy: {
                    contentSecurityPolicy,
                    override: true,
                },
            },
        });

        const cloudfront = new Distribution(this, 'CloudFront', {
            comment: 'CloudFront for UI and API',
            defaultBehavior: {
                origin: S3BucketOrigin.withOriginAccessIdentity(s3Mapping['/*'][0], {
                    originPath: s3Mapping['/*'][1],
                    originAccessIdentity,
                }),
                responseHeadersPolicy,
                allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            additionalBehaviors: {
                ...Object.entries(s3Mapping)
                    .filter(([pathPattern]) => pathPattern !== '/*')
                    .map(([pathPattern, [bucket, path]]) => ({
                        [pathPattern]: {
                            origin: S3BucketOrigin.withOriginAccessIdentity(bucket, {
                                originPath: path,
                                originAccessIdentity,
                            }),
                            allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
                            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                        },
                    })).reduce((o1, o2) => ({ ...o1, ...o2 }), {}),
                ...Object.keys(apiMapping)
                    .map(pathPattern => ({
                        [pathPattern]: {
                            origin: new HttpOrigin(`${apiMapping[pathPattern].restApiId}.execute-api.${this.region}.${this.urlSuffix}`),
                            allowedMethods: AllowedMethods.ALLOW_ALL,
                            cachePolicy: apiCachePolicy,
                            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                        } as BehaviorOptions,
                    })).reduce((o1, o2) => ({ ...o1, ...o2 }), {}),
            },
            errorResponses: [
                {
                    ttl: Duration.minutes(5),
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                },
            ],
            defaultRootObject: 'index.html',
            logBucket,
            logIncludesCookies: true,
            logFilePrefix: 'logs/',
            certificate,
            domainNames: [domainName],
            webAclId: wafWebAcl?.attrArn,
        });

        new ARecord(this, 'CloudfrontRecord', {
            recordName: domainName,
            target: RecordTarget.fromAlias(new CloudFrontTarget(cloudfront)),
            zone: HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
                hostedZoneId: customDomain.hostedZoneId,
                zoneName: domainName,
            }),
        });

        return cloudfront;
    };
}
