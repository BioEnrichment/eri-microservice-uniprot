
import LDFServer, { BOUND, UNBOUND, UNIMPLEMENTED } from 'ldf-facade'

import bodyParser from 'body-parser'

import getConfig from 'eri-config'

import { eriToURIs, urisToERI } from 'eri-xrefdb-client'

import { uniprotToN3, loadUniprotXML } from './uniprot'

import { extractXRefs, uriToDbref } from './uniprotXRefs'

import request from 'request-promise'


const uniprotPrefix = 'http://www.uniprot.org/uniprot/'



const server = new LDFServer()


/* Add a custom getXRefs endpoint (part of enrichment but not part of the
 * default LDF server)
 */
server.app.post('/getXRefs', bodyParser.json(), async (req, res) => {

    console.log('my getXRefs was called')

	var uris = []

    console.log(JSON.stringify(req.body))

	for(let uri of req.body.uris) {

        // TODO: Don't we need to ask uniprot if it has any of these URIs as
        // an xref on something?
        // 

		if(uri.indexOf(uniprotPrefix) === 0) {

			let accession = uri.slice(uniprotPrefix.length)

			let xmlDoc = await loadUniprotXML(accession)

			let xrefs = extractXRefs(xmlDoc)

			uris = uris.concat(xrefs)

			break
		}

	}

	res.send(JSON.stringify({
		uris: uris
	}))
})



/* <uri> ?p ?o
 * Describe a subject
 */
server.pattern({

    s: BOUND,
    p: UNBOUND,
    o: UNBOUND

}, async (state, pattern) => {

	const config = getConfig()

    /* If we are looking for an enrichment URI
     */
	if(pattern.s.indexOf(config.eriPrefix) === 0) {

        /* Get the URIs that this enrichment URI represents (xrefs)
         * We are looking for a uniprot one.
         */
		const uris = await eriToURIs(pattern.s)

		if(uris.length === 0) {
			return { total: 0 }
		}

		for(let uri of uris) {

            console.log('checking xref ' + uri)

			if(uri.indexOf(uniprotPrefix) === 0) {
				
				let accession = uri.slice(uniprotPrefix.length)

                let triples = await uniprotToN3(pattern.s, accession)

				return { triples, total: triples.length, nextState: null }

			}
		}


        return { total: 0 }

	} else {

        return UNIMPLEMENTED

    }


})



/* ?s <uri> <uri>
 * Find a subject with a specific value for a specific property
 */
server.pattern({

    s: UNBOUND,
    p: BOUND,
    o: BOUND

}, async (state, pattern) => {

	const config = getConfig()

    if(pattern.p === 'http://www.w3.org/ns/prov#wasDerivedFrom') {

        return await handleWasDerivedFrom(state, pattern.o)

    }

    return UNIMPLEMENTED
})

async function handleWasDerivedFrom(state, o) {

    if(!state) {
        state = {
            uniprotOffset: 0,
            ourOffset: 0
        }
    }

    var accessions

    if(o.indexOf(uniprotPrefix) === 0) {

        // TODO check it's an actual uniprot protein

        let eri = await urisToERI(o, 'Protein')

        return {
            triples: [
                {
                    s: eri,
                    p: 'http://www.w3.org/ns/prov#wasDerivedFrom',
                    o: o
                }
            ],
            total: 1,
            nextState: null
        }

    } else {

        const dbref = uriToDbref(o)

        const results = await request({
            method: 'get',
            url: 'http://www.uniprot.org/uniprot/',
            proxy: getConfig().proxy,
            qs: {
                query: 'database:(type:' + dbref.type + ' id:' + dbref.id + ')',
                format: 'tab',
                limit: '100',
                offset: state.uniprotOffset + '',
                columns: 'id'
            }
        })

        accessions = results.split(/\s+/)
            .filter((accession) => accession !== 'Entry' && accession !== '')
    }

    if(accessions.length === 0) {
        return null
    }

    const currentAccession = accessions[state.ourOffset]

    let eri = await urisToERI([ uniprotPrefix + currentAccession ], 'Protein')

    let triples = [
        {
            s: eri,
            p: 'http://www.w3.org/ns/prov#wasDerivedFrom',
            o: o
        }
    ]

    if(state.ourOffset + 1 >= accessions.length) {

        let nextState = {
            uniprotOffset: state.uniprotOffset + 100,
            ourOffset: 0
        }

        return { triples, nextState }

    } else {

        let nextState = {
            uniprotOffset: state.uniprotOffset,
            ourOffset: state.ourOffset + 1
        }

        return { triples, nextState }
    }

}

server.listen(9874)

