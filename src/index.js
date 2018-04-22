/**
 * @file Main file for Cartographer
 * @author Ayane Satomi
 * @author Ovyerus
 * @license BSD-3-Clause
 */

const express = require('express');
const got = require('got');
const app = express();

const BASE_URL ='https://api.github.com';
const PORT = process.env.PORT || 8080;
const SITEMAP_PATH = 'wiki/__sitemap.md';

app.use(express.json());

app.post('/cartographer-webhook', async (req, res) => {
    console.log(req.body)
    
    let body = req.body;
    let thisCommit = body.commits.find(c => c.id === body.after);
    
    if (!thisCommit) {
        res.sendStatus(200);
        return;
    }

    let repo = body.repository.full_name;
    let treeURL = `${BASE_URL}/repos/${repo}/git/trees/${thisCommit.tree_id}?recursive=1`;
    let sitemapURL = `${BASE_URL}/repos/${repo}/contents/${SITEMAP_PATH}`; //TODO : replace that ':repo stuff again'
    let treeData = await got(treeURL, {
        headers: {
            Accept: 'application/vnd.github.v3+json'
        }
    });
    let originalTree = JSON.parse(treeData.body).tree;
    let tree = tree.map(v => v.type === 'tree' ? v.path + '/' : v.path).reduce((m, val) => {
        // tree is an array of paths, ie. 'file', 'dir/', 'dir/file'.
        // Directories end with a '/'.
        
    });
    
    tree = __genContent();

    await got.put(sitemapURL, {
        headers: {
            Accept: 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
            message: `Auto-generate Wiki sitemap TIMESTAMP ${new Date()}`,
            content: new Buffer(tree).toString('base64'),
            sha: originalTree.find(v => v.path === SITEMAP_PATH).sha,
            branch: 'master',
            commiter: {
                name: 'Cartographer'
            }
        })
    });
});
/**
 * Generates a sitemap buffer using tree data
 * @returns {Buffer} File buffer for PUT
 */
function __genContent() {
    return new Promise((resolve, reject) => {
        
    })
}

app.get('/cartographer-webhook', (req, res) => {
    res.send('Go awau.');
});

app.listen(PORT, () => {
    console.log(`Cartographer listening on ${PORT}`);
});