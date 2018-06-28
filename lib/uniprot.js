
const request = require('request-promise')
const libxmljs = require('libxmljs')
const { Prefixes, Predicates, Types, Specifiers } = require('bioterms')

import getConfig from 'eri-config'


import { urisToERI } from 'eri-xrefdb-client'

import { extractXRefs } from './uniprotXRefs'


import cache from 'idiot-cache'


export async function loadUniprotXML(accession) {

    let url = 'http://www.uniprot.org/uniprot/' + accession + '.xml'

    return await cache(url, 10000, async () => {
        let body = await request({
            method: 'get',
            url: 'http://www.uniprot.org/uniprot/' + accession + '.xml',
            proxy: getConfig().proxy
        })
        return libxmljs.parseXml(body)
    })

}


export async function uniprotToN3(subject, accession) {

	const xmlDoc = await loadUniprotXML(accession)

    const xrefs = extractXRefs(xmlDoc)

    var triples = processRoot(xmlDoc.root(), subject)

    xrefs.forEach((xref) => {
    	triples.push(uriTriple(subject, Prefixes.prov + 'wasDerivedFrom', xref))
    })

    return triples
    
}


function processRoot(node, subject) {

    if(node.name() !== 'uniprot')
        throw new Error('expected uniprot root tag')

    var triples = []

    node.childNodes().forEach((childNode) => {

        Array.prototype.push.apply(triples, processTopLevel(childNode, subject))

    })

    return triples

}


function uriTriple(s, p, o) {

	return { s, p, o }

}

function stringTriple(s, p, o) {

	return { s, p, o, datatype: 'string' }

}

function processTopLevel(node, subject) {

    if(node.name() === 'entry') {
        return processEntry(node, subject)
    }

}


var accession
var uri


function processEntry(node, subject) {


	var triples = []

    for(let childNode of node.childNodes()) {

        const name = childNode.name()

        if(name === 'accession') {

			continue
        }

		if(name === 'name') {

			triples.push(stringTriple(subject, Prefixes.dcterms + 'title', childNode.text()))

			continue
		}

        if(name === 'protein') {

		    continue

        }

        if(name === 'sequence') {


	    	continue
        }

        if(name === 'dbReference') {

			continue

        }

    }

    return triples
}




