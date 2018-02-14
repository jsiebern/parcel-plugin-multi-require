const path = require('path');
const fs = require('fs');

module.exports = function (bundler) {
    const logger = bundler.logger;

    const readManifestJson = (path) => {
        try {
            return JSON.parse(fs.readFileSync(path, 'utf8'));
        } catch (e) {
            return null;
        }
    };

    const getFileNamesRec = (bundle, names = []) => {
        const asset = bundle.entryAsset ? bundle.entryAsset : bundle.assets.values().next().value;
        if (asset.type === 'js') {
            names.push(asset.generateBundleName());
        }

        bundle.childBundles.forEach((bundle) => {
            getFileNamesRec(bundle, names);
        });

        return names;
    };

    const uniq = (a) => {
        const seen = {};
        return a.filter((item) => seen.hasOwnProperty(item) ? false : (seen[item] = true));
    }

    bundler.on('bundled', (bundle) => {
        const dir = bundle.entryAsset.options.outDir;
        const manifestPath = path.resolve(dir, 'parcel-manifest.json');
        const manifestValue = readManifestJson(manifestPath);

        let fileNames = uniq(getFileNamesRec(bundle));

        if (manifestValue) {
            fileNames = fileNames.map((function (fName) {
                if (typeof manifestValue[fName] !== 'undefined') {
                    return manifestValue[fName];
                }
                return fName;
            }));
        }

        const hash = bundle.entryAsset.hash;

        fileNames.forEach(fName => {
            const p = path.resolve(dir, fName);
            let c = fs.readFileSync(p, 'utf8');
            c = c.replace(/require/g, 'require_' + hash);
            fs.writeFileSync(p, c, 'utf8', (err) => {
                if (err) return console.log(err);
            });
        });

        logger.status('✨', 'Multi Require Applied');
    });
};