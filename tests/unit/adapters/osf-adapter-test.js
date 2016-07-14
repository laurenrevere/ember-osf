import Ember from 'ember';
import {
    moduleFor
} from 'ember-qunit';
import test from 'dummy/tests/ember-sinon-qunit/test';
import sinon from 'sinon';
import FactoryGuy, {
    manualSetup
} from 'ember-data-factory-guy';

import DS from 'ember-data';

moduleFor('adapter:osf-adapter', 'Unit | Adapter | osf adapter', {
    needs: [
        'model:user', 'model:node', 'model:institution', 'model:registration', 'model:log', 'model:comment', 'model:contributor', 'model:file-provider', 'model:node-link', 'model:draft-registration',
        'adapter:osf-adapter', 'adapter:node', 'adapter:user',
        'serializer:node',
        'service:session',
        'transform:links', 'transform:embed'
    ],
    beforeEach() {
        manualSetup(this.container);
    }
});

test('#buildURL appends a trailing slash if missing', function(assert) {
    var url = 'https://api.osf.io/v2/users/me';
    sinon.stub(
        DS.JSONAPIAdapter.prototype,
        'buildURL',
        function() {
            return url;
        }
    );
    let adapter = this.subject();
    let user = FactoryGuy.make('user');
    let result = adapter.buildURL(
        'user',
        'me',
        user._internalModel.createSnapshot(),
        'findRecord'
    );
    assert.notEqual(url, result);
    assert.equal(result.slice(-1), '/');
});

test('#buildURL uses relationship links if available for delete, update, and find', function(assert) {
    let url = 'https://api.osf.io/v2/users/me/rel/';
    let adapter = this.subject();
    let user = FactoryGuy.make('user', {
        links: {
            self: url
        }
    });
    ['delete', 'update', 'find'].forEach(verb => {
        let result = adapter.buildURL(
            'user',
            'me',
            user._internalModel.createSnapshot(),
            `${verb}Record`
        );
        assert.equal(url, result);
    });
});

test('#buildURL uses snapshot.adapterOptions.url if available', function(assert) {
    let url = 'https://api.osf.io/v2/users/me/rel/';
    let adapter = this.subject();
    let user = FactoryGuy.make('user', {
        links: null
    });

    let result = adapter.buildURL(
        'user',
        'me',
        user._internalModel.createSnapshot({
            adapterOptions: {
                url: url
            }
        }),
        'createRecord'
    );
    assert.equal(url, result);
});

test('#_buildRelationshipURL uses relationshipLinks', function(assert) {
    let url = 'https://api.osf.io/v2/users/me/nodes/';
    let adapter = this.subject();
    let user = FactoryGuy.make('user', {
        links: {
            relationships: {
                nodes: {
                    links: {
                        related: {
                            href: url
                        }
                    }
                }
            }
        }
    });

    let result = adapter._buildRelationshipURL(
        user._internalModel.createSnapshot({
            adapterOptions: {
                url: url
            }
        }),
        'nodes'
    );
    assert.equal(url, result);
});

test('#_createRelated maps over each createdSnapshots', function(assert) {
    this.inject.service('store');
    let store = this.store;

    let node = FactoryGuy.make('node');
    Ember.run.begin();
    let contributors = [
        store.createRecord('contributor', {
            title: 'Foo'
        }),
        store.createRecord('contributor', {
            title: 'Bar'
        })
    ];
    Ember.run.end();
    node.get('contributors').pushObjects(contributors);
    let stubs = contributors.map(c => sinon.stub(c, 'save', () => {
        return new Ember.RSVP.Promise((resolve) => resolve());
    }));
    sinon.stub(node, 'resolveRelationship', () => {
        return {
            addCanonicalRecord: () => true
        };
    });

    Ember.run(() => {
        node.save().then(() => {
            stubs.forEach(s => assert.ok(s.called));
        }, () => {
            // Fail
            assert.ok(false);
        });
    });
});
