
let prefixes = {
	'EMBL': null,
	'PIR': 'http://pir.georgetown.edu/cgi-bin/nbrfget?uid=',
	'RefSeq': 'https://www.ncbi.nlm.nih.gov/protein/',
	'PDB': null,
	'PDBsum': null,
	'ProteinModelPortal': null,
	'SMR': null,
	'BioGrid': null,
	'DIP': null,
	'MINT': 'http://mint.bio.uniroma2.it/index.php/detailed-curation/?id=',
	'STRING': 'http://proxy.enrichment.ncl.ac.uk/string/',
	'DrugBank': 'http://www.drugbank.ca/drugs/',
	'PaxDb': null,
	'PRIDE': null,
	'EnsemblBacteria': 'http://proxy.enrichment.ncl.ac.uk/EnsemblBacteria/',
	'EnsemblFungi': 'http://proxy.enrichment.ncl.ac.uk/EnsemblFungi/',
	'GeneID': null,
	'KEGG': null,
	'PATRIC': null,
	'EchoBASE': null,
	'EcoGene': 'http://www.ecogene.org/gene/',
	'eggNOG': 'http://proxy.enrichment.ncl.ac.uk/eggnog/',
	'HOGENOM': null,
	'InParanoid': null,
	'PhylomeDB': null,
	'BioCyc': null,
	'EvolutionaryTrace': null,
	'PRO': null,
	'Proteomes': null,
	'CDD': null,
	'InterPro': null,
	'Pfam': 'http://pfam.xfam.org/family/',
	'PRINTS': null,
	'SMART': null,
	'SUPFAM': null,
	'PROSITE': 'http://prosite.expasy.org/'
}

export function extractXRefs(xmlDoc) {

	var xrefs = []

	for(let accession of xmlDoc.find('//xmlns:accession', 'http://uniprot.org/uniprot')) {

		xrefs.push('http://www.uniprot.org/uniprot/' + accession.text())


	}

	for(let dbReference of xmlDoc.find('//xmlns:dbReference', 'http://uniprot.org/uniprot')) {

		let type = dbReference.attr('type').value()
		let id = dbReference.attr('id').value()

        let uri = dbrefToURI(type, id)

        if(uri)
            xrefs.push(uri)
	}


	return xrefs
}


function getPrefix(type) {
     return prefixes[type] || null
}

export function dbrefToURI(type, id) {

    let prefix = getPrefix(type)

    if(!prefix)
        return null

    return prefix + id
}

export function uriToDbref(uri) {

    for(let k in prefixes) {

        let prefix = prefixes[k]

        if(uri.indexOf(prefix) === 0) {

            let id = uri.slice(prefix.length)

            return { type: k, id: id }
        }

    }

    return null


}



