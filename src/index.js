/**
 * @file Main file for Cartographer
 * @author Ayane Satomi
 * @author Ovyerus
 * @license BSD-3-Clause
 */

const express = require('express');
const got = require('got');
const path = require('path');
const engines = require('consolidate');
const fs = require('fs');
const YAML = require('yamljs');

const app = express();
global.router = express.Router();
let config;

try {
    config = YAML.parse(fs.readFileSync('./config.yml').toString());
} catch(e) {
    config = {};
}

const PORT = Number(process.env.PORT) || config.port || 8080;
const SITEMAP_PATH = process.env.SITEMAP_PATH || config.sitemapPath || 'wiki/_sitemap.md';
const SITEMAP_GEN_PATH = process.env.SITEMAP_GEN_PATH || config.sitemapGenPath || (SITEMAP_PATH.split('/').length > 1 ? SITEMAP_PATH.slice(SITEMAP_PATH.split('/').slice(-1)[0] + 1) : '');
const SKIP_FILES = process.env.SKIP_FILES === 'true' || config.skipFiles || true;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || config.accessToken;
const ACCESS_USER = process.env.ACCESS_USER || config.accessUser;

if (!ACCESS_TOKEN) throw new Error('Missing required variable: "ACCESS_TOKEN". Must either be an environment variable, or "accessToken" in config.json');
if (!ACCESS_USER) throw new Error('Missing required variable: "ACCESS_USER". Must either be an environment variable, or "accessUser" in config.json');

const BASE_URL = `https://api.github.com`;
const AUTH = `${ACCESS_USER}:${ACCESS_TOKEN}`;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', engines.mustache);

app.post('/cartographer-webhook', async (req, res) => {
    let body = req.body;
    
    res.sendStatus(200);

    if (body.zen && body.hook_id && body.hook) {
        console.log('Received webhook ping event.');
        return;
    }

    let thisCommit = body.commits.find(c => c.id === body.after);
    
    if (!thisCommit || thisCommit.author.name === 'Cartographer') return;

    let repo = body.repository.full_name;
    let treeURL = `${BASE_URL}/repos/${repo}/git/trees/${thisCommit.tree_id}?recursive=1`;
    let sitemapURL = `${BASE_URL}/repos/${repo}/contents/${SITEMAP_PATH}`;
    let treeData = await got(treeURL, {
        headers: {
            Accept: 'application/vnd.github.v3+json'
        },
        auth: AUTH
    });

    console.log('Received tree data.');

    let originalTree = JSON.parse(treeData.body).tree;
    let tree = originalTree.filter(v => SKIP_FILES ? v.type === 'tree' : true).map(v => v.type === 'tree' ? v.path + '/' : v.path);
    tree = tree.filter(v => v !== SITEMAP_PATH && v.startsWith(SITEMAP_GEN_PATH)).reduce((m, val) => {
        // tree is an array of paths, ie. 'file', 'dir/', 'dir/file'.
        // Directories end with a '/'.
        if (!val.includes('/') || (val.endsWith('/') && !m[val])) return Object.assign(m, {[val]: {}});
        
        let split = Object.entries(val.split('/'));
        let ref = m; // Yay pointers!

        for (let [i, part] of split) {
            if (split[Number(i) + 1]) part += '/';
            if (!ref[part]) ref[part] = {};
            
            ref = ref[part];
        }
        
        return m;
    }, {});
    
    tree = genContent(tree);
    let content = 'Autogenerated repository sitemap by [Cartographer](https://github.com/sr229/Cartographer)\n';
    content += 'Do not edit.\n\n## Sitemap\n';
    content += tree;

    await got.put(sitemapURL, {
        headers: {
            Accept: 'application/vnd.github.v3+json'
        },
        auth: AUTH,
        body: JSON.stringify({
            message: `Auto-generate Wiki sitemap TIMESTAMP ${new Date()}`,
            content: new Buffer(content).toString('base64'),
            sha: originalTree.find(v => v.path === SITEMAP_PATH) ? originalTree.find(v => v.path === SITEMAP_PATH).sha : null,
            branch: 'master',
            commiter: {
                name: 'Cartographer',
                email: 'cartographer@headbow.stream'
            }
        })
    });
    
    console.log('Created file.');
});

/**
 * Generates a sitemap buffer using tree data
 * @returns {Buffer} File buffer for PUT
 */
function genContent(tree) {
    /* tree is a object like blep
    {
        file: {},
        file2: {},
        'dir/': {
            file1: {},
            'dir2/': {
                file520: {}
            }
        },
        'emptydir/': {}
    }
    */

    return Object.entries(tree).reduce((m, [path, children]) => {
        // If there are no children for the path, add it and continue.
        if (!Object.keys(children).length) return m.concat(`- [${path}](${path.replace(/\s+/g, '_')})`);

        // Make a new array with the path name.
        let thisTree = [`- [${path}](${path.replace(/\s+/g, '_')}`];

        // Recursive function for adding child paths to the above array, and then treating any of children the same way.
        (function looper(subTree, indent, fullPath) {
            for (let child of subTree.entries()) {
                thisTree.push(`${' '.repeat(indent + 1)}- [${child[0]}](${(fullPath + child[0]).replace(/\s+/g, '_')})`);
    
                // Recurse with the child's tree, a new indent, and a new full path.
                if (Object.keys(child[1]).length) looper(child[1], indent + 2, fullPath + child[0]);
            }
        })(children, 1, path);
        
        return m.concat(thisTree.join('\n'));
    }, []).join('\n');
    
    /* The above block transforms that tree object, and outputs something like
    
    - [file](file)
    - [file2](file2)
    - [dir/](dir/
      - [file1](dir/file1)
      - [dir2/](dir/dir2/)
        - [file520](dir/dir2/file520)
    - [emptydir/](emptydir/)
    */
}

app.get('/cartographer-webhook', (req, res) => {
    res.send('Go awau.');
});


//needed if a discerning idiot does try to browse to index

app.get('/', require('./routes/landing.js'));

app.listen(PORT, () => {
    console.log(`Cartographer listening on ${PORT}`);
});