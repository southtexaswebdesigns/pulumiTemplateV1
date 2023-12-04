// Redirect list and redirect rules are handled separately.
// Currently for pages projects it's best to enable web analytics through the GUI. It can be done programmatically but the current implementation requires use of the global (legacy) API key.

import * as pulumi from '@pulumi/pulumi'
import * as github from '@pulumi/github'
import * as cloudflare from '@pulumi/cloudflare'

// config.require for required input, config.get for optional input
let config = new pulumi.Config()
let projectName = config.require('projectName')
let websiteDomain = config.get('websiteDomain')
let cloudflareZoneId = config.require('cloudflareZoneId')
let cloudflareAccountId = config.require('cfAccountId')
let ghAppInstallationId = config.require('ghAppInstallationId')

let ghConfig = new pulumi.Config('github')
let ghOwner = ghConfig.require('owner')
//let ghAppInstallationId = ghConfig.require('ghAppInstallationId')

// const ghRepo = new github.Repository('ghRepo', {
//     name: projectName,
//     description: pulumi.interpolate`${projectName} website`,
//     template: {
//         owner: ghOwner,
//         repository: 'silver-bassoon',
//     },
//     visibility: 'private',
// })

const cfPagesProject = new cloudflare.PagesProject(
    'cfPagesProject',
    {
        accountId: cloudflareAccountId,
        name: projectName,
        productionBranch: 'main',
        buildConfig: {
            buildCommand: 'npm run build',
            destinationDir: 'public',
            // webAnalyticsTag: '',
            // webAnalyticsToken: '',
        },
        deploymentConfigs: {
            preview: {
                alwaysUseLatestCompatibilityDate: false,
                compatibilityDate: '2023-09-04',
                environmentVariables: {
                    NODE_VERSION: '18.17.1',
                },
                failOpen: true,
            },
            production: {
                alwaysUseLatestCompatibilityDate: false,
                compatibilityDate: '2023-09-04',
                environmentVariables: {
                    NODE_VERSION: '18.17.1',
                },
                failOpen: true,
            },
        },
        source: {
            config: {
                deploymentsEnabled: true,
                owner: ghOwner,
                prCommentsEnabled: true,
                previewBranchExcludes: ['main'],
                previewBranchIncludes: ['dev', 'preview'],
                previewDeploymentSetting: 'all',
                productionBranch: 'main',
                productionDeploymentEnabled: true,
                repoName: projectName,
            },
            type: 'github',
        },
    } //,
    // { dependsOn: [ghRepo] }
)

// Only configure custom domain if it is set in config
if (websiteDomain !== undefined && websiteDomain !== null) {
    const my_domain = new cloudflare.PagesDomain(
        'my-domain',
        {
            accountId: cloudflareAccountId,
            domain: websiteDomain,
            projectName: projectName,
        },
        { dependsOn: [cfPagesProject] }
    )
    // Add DNS records. This is done automatically if you add the domain through the gui
    const wwwRecord = new cloudflare.Record('www', {
        zoneId: cloudflareZoneId,
        name: 'www',
        value: '192.0.2.1',
        type: 'A',
        proxied: true,
    })
    const customDomainRecord = new cloudflare.Record('customDomain', {
        zoneId: cloudflareZoneId,
        name: websiteDomain,
        value: cfPagesProject.subdomain,
        type: 'CNAME',
        proxied: true,
    })
}

// https://www.pulumi.com/registry/packages/github/api-docs/appinstallationrepository/
const someAppRepo = new github.AppInstallationRepository('someAppRepo', {
    installationId: ghAppInstallationId,
    repository: projectName,
})

// export const ghRepoName = ghRepo.name
