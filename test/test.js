(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    global.Promise = require('es6-promise').Promise;

    var
      assert = require('assert'),
      fs = require('fs'),
      path = require('path'),
      rdf = require('../rdf-ext')(),
      utils = require('rdf-test-utils')(rdf);

    var readFile = function (filename) {
      return new Promise(function (resolve) {
        resolve(fs.readFileSync(path.join(__dirname, filename)).toString());
      });
    };

    module.exports = factory(assert, rdf, readFile, utils);
  } else {
    var readFile = function (filename) {
      return new Promise(function (resolve) {
        root.rdf.defaultRequest('GET', filename, {}, null, function (status, headers, content) {
          resolve(content);
        });
      });
    };

    factory(root.assert, root.rdf, readFile, root.rdf.testUtils(root.rdf));
  }
})(this, function (assert, rdf, readFile, utils) {
  var isNode = (typeof process !== 'undefined' && process.versions && process.versions.node);

  describe('rdf-ext', function() {
    var
      cardGraph,
      listGraph;

    var buildCardGraph = function() {
      var graph = rdf.createGraph();

      var cardNode = rdf.createNamedNode('https://www.example.com/john/card#me');

      graph.add(rdf.createTriple(
        cardNode,
        rdf.createNamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        rdf.createNamedNode('http://xmlns.com/foaf/0.1/Person')));

      graph.add(rdf.createTriple(
        cardNode,
        rdf.createNamedNode('http://xmlns.com/foaf/0.1/name'),
        rdf.createLiteral('John Smith', 'en')));

      var keyNode = rdf.createBlankNode();

      graph.add(rdf.createTriple(
        cardNode,
        rdf.createNamedNode('http://www.w3.org/ns/auth/cert#key'),
        keyNode));

      graph.add(rdf.createTriple(
        keyNode,
        rdf.createNamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        rdf.createNamedNode('http://www.w3.org/ns/auth/cert#RSAPublicKey')));

      graph.add(rdf.createTriple(
        keyNode,
        rdf.createNamedNode('http://www.w3.org/ns/auth/cert#exponent'),
        rdf.createLiteral('65537', null, rdf.createNamedNode('http://www.w3.org/2001/XMLSchema#integer'))));

      graph.add(rdf.createTriple(
        keyNode,
        rdf.createNamedNode('http://www.w3.org/ns/auth/cert#modulus'),
        rdf.createLiteral('abcdef', null, rdf.createNamedNode('http://www.w3.org/2001/XMLSchema#hexBinary'))));

      return graph;
    };

    before(function(done) {
      var parser = new rdf.promise.Parser(new rdf.TurtleParser());

      cardGraph = buildCardGraph();

      readFile('support/list.nt')
        .then(function (list) { return parser.parse(list, 'https://example.com/list'); })
        .then(function (graph) {
          listGraph = graph;

        })
        .then(function () { done(); });
    });

    describe('parsers', function() {
      it('Turtle parser should parse card.ttl', function(done) {
        var parser = new rdf.promise.Parser(new rdf.TurtleParser());

        readFile('support/card.ttl')
          .then(function (card) { return parser.parse(card, 'https://www.example.com/john/card') })
          .then(function (graph) { return  utils.p.assertGraphEqual(graph, cardGraph); })
          .then(function () { done() })
          .catch(function (error) { done(error); });
      });

      it('Turtle parser should forward error', function(done) {
        rdf.parseTurtle('this is not a Turtle string', function (graph, error) {
          assert.equal(graph, null);
          assert.notEqual(error, null);

          done();
        });
      });

      it('JSON-LD parser should parse card.json', function(done) {
        var parser = new rdf.promise.Parser(new rdf.JsonLdParser());

        readFile('support/card.json')
          .then(function (card) { return parser.parse(card, 'https://www.example.com/john/card') })
          .then(function (graph) { return  utils.p.assertGraphEqual(graph, cardGraph); })
          .then(function () { done() })
          .catch(function (error) { done(error); });
      });

      it('JSON-LD parser should forward error', function(done) {
        rdf.parseJsonLd('{"@context": "urn:test"}', function (graph, error) {
          assert.equal(graph, null);
          assert.notEqual(error, null);

          done();
        });
      });

      it('JSON-LD parser should parse list.json', function(done) {
        var parser = new rdf.promise.Parser(new rdf.JsonLdParser());

        readFile('support/list.json')
          .then(function (list) { return parser.parse(list, 'https://www.example.com/list') })
          .then(function (graph) { return  utils.p.assertGraphEqual(graph, listGraph); })
          .then(function () { done() })
          .catch(function (error) { done(error); });
      });

      it('RDF/XML parser should parse card.xml', function(done) {
        var parser = new rdf.promise.Parser(new rdf.RdfXmlParser());

        readFile('support/card.xml')
          .then(function (card) { return parser.parse(card, 'https://www.example.com/john/card') })
          .then(function (graph) { return  utils.p.assertGraphEqual(graph, cardGraph); })
          .then(function () { done() })
          .catch(function (error) { done(error); });
      });

      it('RDF/XML parser should forward error', function(done) {
        rdf.parseTurtle('this is not a RDF/XML string', function (graph, error) {
          assert.equal(graph, null);
          assert.notEqual(error, null);

          done();
        });
      });

      /* currently no language support in RDFa parser
      if (isNode) {
        it('RDFa parser should parse card.xml', function(done) {
          var parser = new rdf.promise.Parser(new rdf.RdfaParser());

          readFile('support/card.rdfa.html')
            .then(function (card) { return parser.parse(card, 'https://www.example.com/john/card') })
            .then(function (graph) { return  utils.p.assertGraphEqual(graph, cardGraph); })
            .then(function () { done() })
            .catch(function (error) { done(error); });
        });
      }*/
    });

    describe('serializers', function () {
      it('Turtle serializer should generate parsable card', function (done) {
        var
          serializer = new rdf.promise.Serializer(new rdf.TurtleSerializer()),
          parser = new rdf.promise.Parser(new rdf.TurtleParser());

        serializer.serialize(cardGraph)
          .then(function (card) { return parser.parse(card, 'https://www.example.com/john/card'); })
          .then(function (graph) { return  utils.p.assertGraphEqual(graph, cardGraph); })
          .then(function () { done() })
          .catch(function (error) { done(error); });
      });

      it('JSON-LD serializer should generate parseable card', function(done) {
        var
          serializer = new rdf.promise.Serializer(new rdf.JsonLdSerializer()),
          parser = new rdf.promise.Parser(new rdf.JsonLdParser());

        serializer.serialize(cardGraph)
          .then(function (card) { return parser.parse(card, 'https://www.example.com/john/card'); })
          .then(function (graph) { return  utils.p.assertGraphEqual(graph, cardGraph); })
          .then(function () { done() })
          .catch(function (error) { done(error); });
      });
    });

    describe('RDFa test suite', function () {
      if (isNode) {
        var
          base = 'http://www.w3.org/2006/07/SWD/RDFa/testsuite/testcases/',
          tests = [
            '000002',
            '000003',
            //'000004',
            //'000005',
            //'000006',
            '000007',
            '000008',
            '000010',
            //'000011',
            '000012',
            //'000013',
            //'000014',
            //'000015',
            '000016',
            //'000017',
            '000019',
            //'000020',
            '000101',
            '000102',
            '000103',
            //'000104',
            //'000105',
            //'000106',
            '000107',
            //'000108',
            '000109',
            '000110',
            //'000112',
            '000113'
          ],
          rdfaParser = new rdf.promise.Parser(new rdf.RdfaParser()),
          turtleParser = new rdf.promise.Parser(new rdf.TurtleParser());

        var runTest = function (number) {
          it('should pass test ' + number, function (done) {

            Promise.all([
              readFile('support/rdfa/' + number + '.html'),
              readFile('support/rdfa/' + number + '.ttl')
            ]).then(function (contents) {
              return Promise.all([
                rdfaParser.parse(contents[0], base + number + '.html'),
                turtleParser.parse(contents[1], base + number + '.html')
              ])
            }).then(function (graphs) {
              return utils.p.assertGraphEqual(graphs[0], graphs[1]);
            }).then(function () {
              done()
            }).catch(function (error) {
              done(error);
            })
          });
        };

        tests.forEach(function (number) {
          runTest(number);
        })
      }
    });

    describe('microdata-rdf test suite', function () {
      var
        tests = [
          '0001',
          '0002',
          '0003',
          '0004',
          '0005',
          '0006',
          '0007',
          '0008',
          '0009',
          '0010',
          '0011',
          '0012',
          '0013',
          '0014',
          '0015',
          '0046',
          '0047',
          '0048',
          '0049',
          '0050',
          '0051',
          '0052',
          '0053',
          '0054',
          '0055',
          '0056',
          '0057',
          '0058',
          '0059',
          '0060',
          '0061',
          '0062',
          '0063',
          '0064',
          //'0065',
          //'0066',
          //'0067',
          '0068',
          '0069',
          '0070',
          //'0073',
          //'0074',
          '0075',
          '0076',
          '0077',
          '0078',
          '0079',
          '0080',
          //'0081',
          //'0082',
          '0083',
          //'0084'
      ],
        microdataParser = new rdf.promise.Parser(new rdf.MicrodataParser()),
        turtleParser = new rdf.promise.Parser(new rdf.TurtleParser());

      var runTest = function (number) {
        it('should pass test ' + number, function (done) {

          Promise.all([
            readFile('support/microdata-rdf/' + number + '.html'),
            readFile('support/microdata-rdf/' + number + '.ttl')
          ]).then(function (contents) {
            return Promise.all([
              microdataParser.parse(contents[0], 'http://example.com/' + number + '.html'),
              turtleParser.parse(contents[1], 'http://example.com/' + number + '.html')
            ])
          }).then(function (graphs) {
            return utils.p.assertGraphEqual(graphs[0], graphs[1]);
          }).then(function () {
            done()
          }).catch(function (error) {
            done(error);
          })
        });
      };

      tests.forEach(function (number) {
        runTest(number);
      })
    });

    describe('InMemoryStore', function () {
      it('should return only data of the given named graph', function (done) {
        var
          store = new rdf.promise.Store(new rdf.InMemoryStore()),
          graphA = rdf.createGraph(),
          graphB = rdf.createGraph();

        graphA.add(rdf.createTriple(
          rdf.createNamedNode('http://example.org/test#s-a'),
          rdf.createNamedNode('http://example.org/test#p'),
          rdf.createNamedNode('http://example.org/test#o')));

        graphB.add(rdf.createTriple(
          rdf.createNamedNode('http://example.org/test#s-b'),
          rdf.createNamedNode('http://example.org/test#p'),
          rdf.createNamedNode('http://example.org/test#o')));

        store.add('http://example.org/test-a', graphA)
          .then(function () { return store.add('http://example.org/test-b', graphB); })
          .then(function () { return store.graph('http://example.org/test-b'); })
          .then(function (graph) {
            assert.equal(graph.length, 1);
            assert(graph.some(function (t) { return t.subject.equals('http://example.org/test#s-b') }));
          })
          .then(function () { done() })
          .catch(function (error) { done(error); });
      });

      it('should return data of all graphs', function (done) {
        var
          store = new rdf.promise.Store(new rdf.InMemoryStore()),
          graphA = rdf.createGraph(),
          graphB = rdf.createGraph();

        graphA.add(rdf.createTriple(
          rdf.createNamedNode('http://example.org/test#s-a'),
          rdf.createNamedNode('http://example.org/test#p'),
          rdf.createNamedNode('http://example.org/test#o')));

        graphB.add(rdf.createTriple(
          rdf.createNamedNode('http://example.org/test#s-b'),
          rdf.createNamedNode('http://example.org/test#p'),
          rdf.createNamedNode('http://example.org/test#o')));

        store.add('http://example.org/test-a', graphA)
          .then(function () { return store.add('http://example.org/test-b', graphB); })
          .then(function () { return store.graph(undefined); })
          .then(function (graph) {
            assert.equal(graph.length, 2);
            assert(graph.some(function (t) { return t.subject.equals('http://example.org/test#s-a') }));
            assert(graph.some(function (t) { return t.subject.equals('http://example.org/test#s-b') }));
          })
          .then(function () { done() })
          .catch(function (error) { done(error); });
      });

      it('should run match over all graphs', function (done) {
        var
          store = new rdf.promise.Store(new rdf.InMemoryStore()),
          graphA = rdf.createGraph(),
          graphB = rdf.createGraph();

        graphA.add(rdf.createTriple(
          rdf.createNamedNode('http://example.org/test#s-a'),
          rdf.createNamedNode('http://example.org/test#p'),
          rdf.createNamedNode('http://example.org/test#o')));

        graphB.add(rdf.createTriple(
          rdf.createNamedNode('http://example.org/test#s-b'),
          rdf.createNamedNode('http://example.org/test#p'),
          rdf.createNamedNode('http://example.org/test#o')));

        store.add('http://example.org/test-a', graphA)
          .then(function () { return store.add('http://example.org/test-b', graphB); })
          .then(function () { return store.match(undefined, 'http://example.org/test#s-b'); })
          .then(function (graph) {
            assert.equal(graph.length, 1);
            assert(graph.some(function (t) { return t.subject.equals('http://example.org/test#s-b') }));
          })
          .then(function () { done() })
          .catch(function (error) { done(error); });
      });
    });
  });
});