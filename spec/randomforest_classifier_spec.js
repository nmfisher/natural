/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var natural = require('../lib/natural');
var sinon = require('sinon');
var baseClassifier = require('../lib/natural/classifiers/classifier.js');

describe('RF classifier', function() {
    describe('classifier', function() {
         it('should classify with arrays', function() {
            
            // random forest are not deterministic, check on average it works            
            var classifier = new natural.RandomForestClassifier();
            classifier.addDocument(['fix', 'box'], 'computing');
            classifier.addDocument(['write', 'code'], 'computing');
            classifier.addDocument(['script', 'code'], 'computing');
            classifier.addDocument(['write', 'book'], 'literature');
            classifier.addDocument(['read', 'book'], 'literature');
            classifier.addDocument(['study', 'book'], 'literature');

            var count = 0;
            for(var tests=0; tests<100; tests++){
                classifier.train();
                if(classifier.classify(['bug', 'code']) == 'computing' && 
                    classifier.classify(['read', 'thing']) == 'literature') {
                    count++;
                }
            }
            expect(count).toBeGreaterThan(50); 
            
        });

        it('should classify with parallel training', function() {
            var classifier = new natural.RandomForestClassifier();

            classifier.addDocument(['fix', 'box'], 'computing');
            classifier.addDocument(['write', 'code'], 'computing');
            classifier.addDocument(['script', 'code'], 'computing');
            classifier.addDocument(['write', 'book'], 'literature');
            classifier.addDocument(['read', 'book'], 'literature');
            classifier.addDocument(['study', 'book'], 'literature');

            classifier.trainParallel(2, function(err) {
              expect(classifier.classify(['bug', 'code'])).toBe('computing');
              expect(classifier.classify(['read', 'thing'])).toBe('literature');
              asyncSpecDone();
            });
        });

        it('should classify with parallel batched training', function() {
            var classifier = new natural.RandomForestClassifier();

            classifier.addDocument(['fix', 'box'], 'computing');
            classifier.addDocument(['write', 'code'], 'computing');
            classifier.addDocument(['script', 'code'], 'computing');
            classifier.addDocument(['write', 'book'], 'literature');
            classifier.addDocument(['read', 'book'], 'literature');
            classifier.addDocument(['study', 'book'], 'literature');

            classifier.events.on('doneTraining', function() {
                expect(classifier.classify(['bug', 'code'])).toBe('computing');
                expect(classifier.classify(['read', 'thing'])).toBe('literature');
                asyncSpecDone();
            });

            classifier.trainParallelBatches({numThreads: 2, batchSize: 2});
        });

        it('should provide all classification scores', function() {
            var classifier = new natural.RandomForestClassifier();
            classifier.addDocument(['fix', 'box'], 'computing');
            classifier.addDocument(['write', 'code'], 'computing');
            classifier.addDocument(['script', 'code'], 'computing');
            classifier.addDocument(['write', 'book'], 'literature');
            classifier.addDocument(['read', 'book'], 'literature');
            classifier.addDocument(['study', 'book'], 'literature');

            classifier.train();

	    expect(classifier.getClassifications('i write code')[0].label).toBe('computing');
	    expect(classifier.getClassifications('i write code')[1].label).toBe('literature');
        });

        it('should classify with strings', function() {
            var classifier = new natural.RandomForestClassifier();
            classifier.addDocument('i fixed the box', 'computing');
            classifier.addDocument('i write code', 'computing');
            classifier.addDocument('nasty script code', 'computing');
            classifier.addDocument('write a book', 'literature');
            classifier.addDocument('read a book', 'literature');
            classifier.addDocument('study the books', 'literature');

            classifier.train();

            expect(classifier.classify('a bug in the code')).toBe('computing');
            expect(classifier.classify('read all the books')).toBe('literature');
        }); 

        it('should classify and re-classify after document-removal', function() {
            var classifier = new natural.RandomForestClassifier();
            var arr, item, classifications = {};

            // Add some good/bad docs and train
            classifier.addDocument('foo baz', 'good');
            classifier.addDocument('qux zooby', 'bad');
            classifier.addDocument('asdf qwer', 'bad');          
            
            classifier.train();
           
            
           
            expect(classifier.classify('foo')).toBe('good');
            expect(classifier.classify('qux')).toBe('bad');
  
            // Remove one of the bad docs, retrain
            classifier.removeDocument('qux zooby', 'bad');
            classifier.retrain(); 


            // Re-classify as good, retrain
            classifier.addDocument('qux zooby', 'good');
            classifier.retrain();

            // Should now be good, original docs should be unaffected
            expect(classifier.classify('foo')).toBe('good');
            expect(classifier.classify('qux')).toBe('good');  
        });  

         it('should serialize and deserialize a working classifier', function() {
             
            var classifier = new natural.RandomForestClassifier();
            classifier.addDocument('i fixed the box', 'computing');
            classifier.addDocument('i write code', 'computing');
            classifier.addDocument('nasty script code', 'computing');
            classifier.addDocument('write a book', 'literature');
            classifier.addDocument('read a book', 'literature');
            classifier.addDocument('study the books', 'literature');
            
            
            // serialize & deserialize before training
            var obj = JSON.stringify(classifier);
            var classifier = natural.RandomForestClassifier.restore(JSON.parse(obj));

            classifier.addDocument('kick a ball', 'sports');
            classifier.addDocument('hit some balls', 'sports');
            classifier.addDocument('kick and punch', 'sports');

            classifier.train();
            // serialize & deserialize after training
            expect(classifier.classify('a bug in the code')).toBe('computing');
            expect(classifier.classify('read all the books')).toBe('literature');
            expect(classifier.classify('kick butt')).toBe('sports');
            
            let newClassifier = natural.RandomForestClassifier.restore(JSON.parse(JSON.stringify(classifier)));
            
            expect(newClassifier.classify('a bug in the code')).toBe('computing');
            expect(newClassifier.classify('read all the books')).toBe('literature');
            expect(newClassifier.classify('kick butt')).toBe('sports');

        });

  	it('should save and load a working classifier', function() {
        var classifier = new natural.RandomForestClassifier();
	    classifier.addDocument('i fixed the box', 'computing');
	    classifier.addDocument('i write code', 'computing');
	    classifier.addDocument('nasty script code', 'computing');
	    classifier.addDocument('write a book', 'literature');
	    classifier.addDocument('read a book', 'literature');
	    classifier.addDocument('study the books', 'literature');

	    classifier.train();

        classifier.save('randomforest_classifier.json', function(err) {
        natural.RandomForestClassifier.load('bayes_classifier.json', null,
            function(err, newClassifier){
                  newClassifier.addDocument('kick a ball', 'sports');
                  newClassifier.addDocument('hit some balls', 'sports');
                  newClassifier.addDocument('kick and punch', 'sports');

                  newClassifier.train();

                  expect(newClassifier.classify('a bug in the code')).toBe('computing');
                  expect(newClassifier.classify('read all the books')).toBe('literature');
                  expect(newClassifier.classify('kick butt')).toBe('sports');
                  asyncSpecDone();
              });
        });
	});

        it('should only execute the callback once when failing to load a classifier', function() {
            natural.RandomForestClassifier.load('nonexistant_bayes_classifier.json', null, function(err, newClassifier){
              expect(err.code).toBe('ENOENT');
              expect(newClassifier).toBe(undefined);
              asyncSpecDone();
            });
        }); 

 
    });

    describe('load', function () {

        var sandbox;

        beforeEach(function () {
            sandbox = sinon.sandbox.create();
        });

        afterEach(function () {
            sandbox.restore();
        });

        it('should pass an error to the callback function', function () {
            sandbox.stub(baseClassifier, 'load', function (filename, cb) {
                cb(new Error('An error occurred'));
            });
            natural.RandomForestClassifier.load('/spec/test_data/tfidf_document1.txt', null, function (err, newClassifier) {
                expect(err).toBe.ok;
                expect(newClassifier).not.toBe.ok;
            });
        }); 
    }); 
});


