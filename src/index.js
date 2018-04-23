/**
 * @file Main file for Cartographer
 * @author Ayane Satomi
 * @author Ovyerus
 * @license BSD-3-Clause
 */

const express = require('express');
const got = require('got');
const app = express();

global.router = express.Router();

const BASE_URL ='https://api.github.com';
const PORT = process.env.PORT || 8080;
const SITEMAP_PATH = 'wiki/__sitemap.md';

app.use(express.json());

app.post('/cartographer-webhook', async (req, res) => {
    console.log(req.body)
    return;

    let body = req.body;
    let thisCommit = body.commits.find(c => c.id === body.after);
    
    if (!thisCommit || thisCommit.author.name === 'Cartographer') {
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
    let tree = tree.map(v => v.type === 'tree' ? v.path + '/' : v.path).filter(v => v !== SITEMAP_PATH).reduce((m, val) => {
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
    });
    
    tree = genContent(tree);

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
            for (let child of Object.entries(subTree)) {
                thisTree.push(`${' '.repeat(indent + 1)}- [${child[0]}](${(fullPath + child[0]).replace(/\s+/g, '_')})`);
    
                // Recursive with the child's tree, a new indent, and a new full path.
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

app.listen(PORT, () => {
    console.log(`Cartographer listening on ${PORT}`);
});

//needed if a discerning idiot does try to browse to index

app.get('/', require('routes/landing.js'));