import assert from "assert"

import {Presence} from "../js/phoenix"

let clone = (obj) => { return JSON.parse(JSON.stringify(obj)) }

let fixtures = {
  joins(){
    return {u1: {metas: [{id: 1, phx_ref: "1.2"}]}}
  },
  leaves(){
    return {u2: {metas: [{id: 2, phx_ref: "2"}]}}
  },
  state(){
    return {
      u1: {metas: [{id: 1, phx_ref: "1"}]},
      u2: {metas: [{id: 2, phx_ref: "2"}]},
      u3: {metas: [{id: 3, phx_ref: "3"}]}
    }
  }
}

describe("syncState", () => {
  it("syncs empty state", () => {
    let newState = {u1: {metas: [{id: 1, phx_ref: "1"}]}}
    let state = {}
    let stateBefore = clone(state)
    Presence.syncState(state, newState)
    assert.deepEqual(state, stateBefore)

    state = Presence.syncState(state, newState)
    assert.deepEqual(state, newState)
  })

  it("onJoins new presences and onLeave's left presences", () => {
    let newState = fixtures.state()
    let state = {u4: {metas: [{id: 4, phx_ref: "4"}]}}
    let joined = {}
    let left = {}
    let onJoin = (key, current, newPres) => {
      joined[key] = {current: current, newPres: newPres}
    }
    let onLeave = (key, current, leftPres) => {
      left[key] = {current: current, leftPres: leftPres}
    }
    let stateBefore = clone(state)
    Presence.syncState(state, newState, onJoin, onLeave)
    assert.deepEqual(state, stateBefore)

    state = Presence.syncState(state, newState, onJoin, onLeave)
    assert.deepEqual(state, newState)
    assert.deepEqual(joined, {
      u1: {current: null, newPres: {metas: [{id: 1, phx_ref: "1"}]}},
      u2: {current: null, newPres: {metas: [{id: 2, phx_ref: "2"}]}},
      u3: {current: null, newPres: {metas: [{id: 3, phx_ref: "3"}]}}
    })
    assert.deepEqual(left, {
      u4: {current: {metas: []}, leftPres: {metas: [{id: 4, phx_ref: "4"}]}}
    })
  })

  it("onJoins only newly added metas", () => {
    let newState = {u3: {metas: [{id: 3, phx_ref: "3"}, {id: 3, phx_ref: "3.new"}]}}
    let state = {u3: {metas: [{id: 3, phx_ref: "3"}]}}
    let joined = {}
    let left = {}
    let onJoin = (key, current, newPres) => {
      joined[key] = {current: current, newPres: newPres}
    }
    let onLeave = (key, current, leftPres) => {
      left[key] = {current: current, leftPres: leftPres}
    }
    state = Presence.syncState(state, newState, onJoin, onLeave)
    assert.deepEqual(state, newState)
    assert.deepEqual(joined, {
      u3: {current: {metas: [{id: 3, phx_ref: "3"}]},
           newPres: {metas: [{id: 3, phx_ref: "3"}, {id: 3, phx_ref: "3.new"}]}}
    })
    assert.deepEqual(left, {})
  })
})

describe("syncDiff", () => {
  it("syncs empty state", () => {
    let joins = {u1: {metas: [{id: 1, phx_ref: "1"}]}}
    let state = {}
    Presence.syncDiff(state, {joins: joins, leaves: {}})
    assert.deepEqual(state, {})

    state = Presence.syncDiff(state, {
      joins: joins,
      leaves: {}
    })
    assert.deepEqual(state, joins)
  })

  it("removes presence when meta is empty and adds additional meta", () => {
    let state = fixtures.state()
    state = Presence.syncDiff(state, {joins: fixtures.joins(), leaves: fixtures.leaves()})

    assert.deepEqual(state, {
      u1: {metas: [{id: 1, phx_ref: "1"}, {id: 1, phx_ref: "1.2"}]},
      u3: {metas: [{id: 3, phx_ref: "3"}]}
    })
  })

  it("removes meta while leaving key if other metas exist", () => {
    let state = {
      u1: {metas: [{id: 1, phx_ref: "1"}, {id: 1, phx_ref: "1.2"}]}
    }
    state = Presence.syncDiff(state, {joins: {}, leaves: {u1: {metas: [{id: 1, phx_ref: "1"}]}}})

    assert.deepEqual(state, {
      u1: {metas: [{id: 1, phx_ref: "1.2"}]},
    })
  })
})


describe("list", () => {
  it("lists full presence by default", () => {
    let state = fixtures.state()
    assert.deepEqual(Presence.list(state), [
      {metas: [{id: 1, phx_ref: "1"}]},
      {metas: [{id: 2, phx_ref: "2"}]},
      {metas: [{id: 3, phx_ref: "3"}]}
    ])
  })

  it("lists with custom function", () => {
    let state = {u1: {metas: [
      {id: 1, phx_ref: "1.first"},
      {id: 1, phx_ref: "1.second"}]
    }}

    let listBy = (key, {metas: [first, ...rest]}) => {
      return first
    }

    assert.deepEqual(Presence.list(state, listBy), [
      {id: 1, phx_ref: "1.first"}
    ])
  })
})

describe("class based API", () => {
  describe("syncState", () => {
    it("syncs empty state", () => {
      const newState = {u1: {metas: [{id: 1, phx_ref: "1"}]}}
      const presence = new Presence()
      presence.syncState(newState)
      assert.deepEqual(presence.state, newState)
    })

    it("onJoins new presences and onLeave's left presences", () => {
      const newState = fixtures.state()
      const presence = new Presence()
      presence.state = {u4: {metas: [{id: 4, phx_ref: "4"}]}}
      const joined = {}
      const left = {}
      presence.onJoin( (key, current, newPres) => {
        joined[key] = {current: current, newPres: newPres}
      })
      presence.onLeave( (key, current, leftPres) => {
        left[key] = {current: current, leftPres: leftPres}
      })
      presence.syncState(newState)
      assert.deepEqual(presence.state, newState)
      assert.deepEqual(joined, {
        u1: {current: null, newPres: {metas: [{id: 1, phx_ref: "1"}]}},
        u2: {current: null, newPres: {metas: [{id: 2, phx_ref: "2"}]}},
        u3: {current: null, newPres: {metas: [{id: 3, phx_ref: "3"}]}}
      })
      assert.deepEqual(left, {
        u4: {current: {metas: []}, leftPres: {metas: [{id: 4, phx_ref: "4"}]}}
      })
    })

    it("onJoins only newly added metas", () => {
      const newState = {u3: {metas: [{id: 3, phx_ref: "3"}, {id: 3, phx_ref: "3.new"}]}}
      const presence = new Presence()
      presence.state = {u3: {metas: [{id: 3, phx_ref: "3"}]}}
      const joined = {}
      const left = {}
      presence.onJoin( (key, current, newPres) => {
        joined[key] = {current: current, newPres: newPres}
      })
      presence.onLeave( (key, current, leftPres) => {
        left[key] = {current: current, leftPres: leftPres}
      })
      presence.syncState(newState)
      assert.deepEqual(presence.state, newState)
      assert.deepEqual(joined, {
        u3: {current: {metas: [{id: 3, phx_ref: "3"}]},
             newPres: {metas: [{id: 3, phx_ref: "3"}, {id: 3, phx_ref: "3.new"}]}}
      })
      assert.deepEqual(left, {})
    })
  })

  describe("syncDiff", () => {
    it("syncs empty state", () => {
      const joins = {u1: {metas: [{id: 1, phx_ref: "1"}]}}

      const presence = new Presence()
      presence.syncDiff({joins: joins, leaves: {}})
      assert.deepEqual(presence.state, joins)
    })

    it("removes presence when meta is empty and adds additional meta", () => {
      const presence = new Presence()
      presence.state = fixtures.state()
      presence.syncDiff({joins: fixtures.joins(), leaves: fixtures.leaves()})

      assert.deepEqual(presence.state, {
        u1: {metas: [{id: 1, phx_ref: "1"}, {id: 1, phx_ref: "1.2"}]},
        u3: {metas: [{id: 3, phx_ref: "3"}]}
      })
    })

    it("removes meta while leaving key if other metas exist", () => {
      const presence = new Presence()
      presence.state = {
        u1: {metas: [{id: 1, phx_ref: "1"}, {id: 1, phx_ref: "1.2"}]}
      }
      presence.syncDiff({joins: {}, leaves: {u1: {metas: [{id: 1, phx_ref: "1"}]}}})

      assert.deepEqual(presence.state, {
        u1: {metas: [{id: 1, phx_ref: "1.2"}]},
      })
    })
  })

  describe("onChange", function(){
    beforeEach(() => {
      const changeData = {}
      this.presence = new Presence()
      this.presence.onChange( (presence, oldState) => {
        changeData.presenceState = clone(presence.state)
        changeData.oldState = oldState
      })
      this.changeData = changeData
    })

    it("with empty state and syncDiff", () => {
      const joins = {u1: {metas: [{id: 1, phx_ref: "1"}]}}

      this.presence.syncDiff({joins: joins, leaves: {}})
      assert.deepEqual(this.presence.state, joins)
      assert.deepEqual(this.changeData.presenceState, joins)
      assert.deepEqual(this.changeData.oldState, {})
    })

    it("with empty state and syncState", () => {
      const newState = {u1: {metas: [{id: 1, phx_ref: "1"}]}}

      this.presence.syncState(newState)
      assert.deepEqual(this.presence.state, newState)
      assert.deepEqual(this.changeData.presenceState, newState)
      assert.deepEqual(this.changeData.oldState, {})
    })

    it("with prepopulated state and syncDiff", () => {
      this.presence.state = fixtures.state()
      this.presence.syncDiff({joins: fixtures.joins(), leaves: fixtures.leaves()})

      const newState = {
        u1: {metas: [{id: 1, phx_ref: "1"}, {id: 1, phx_ref: "1.2"}]},
        u3: {metas: [{id: 3, phx_ref: "3"}]}
      }

      assert.deepEqual(this.presence.state, newState)
      assert.deepEqual(this.changeData.presenceState, newState)
      assert.deepEqual(this.changeData.oldState, fixtures.state())
    })
  })

  describe("list", () => {
    it("lists full presence by default", () => {
      const presence = new Presence()
      presence.state = fixtures.state()
      assert.deepEqual(presence.list(), [
        {metas: [{id: 1, phx_ref: "1"}]},
        {metas: [{id: 2, phx_ref: "2"}]},
        {metas: [{id: 3, phx_ref: "3"}]}
      ])
    })

    it("lists with custom function", () => {
      const presence = new Presence()
      presence.state = {u1: {metas: [
        {id: 1, phx_ref: "1.first"},
        {id: 1, phx_ref: "1.second"}]
      }}

      const listBy = (key, {metas: [first, ...rest]}) => {
        return first
      }

      assert.deepEqual(presence.list(listBy), [
        {id: 1, phx_ref: "1.first"}
      ])
    })
  })

  describe("out of sync events", () => {
    it("duplicate join event after state", () => {
      const presence = new Presence()
      presence.state = fixtures.state()
      presence.onJoin((...args) => {
        assert(false, "Should not rejoin, got: " + JSON.stringify(args))
      })
      presence.syncDiff({joins: {u1: {metas: [{id: 1, phx_ref: "1"}]}}, leaves: {}})
      assert.deepEqual(presence.state, fixtures.state())
    })

    it("duplicate join event before state", () => {
      const presence = new Presence()
      const joins = {u1: {metas: [{id: 1, phx_ref: "1"}]}}
      const newState = fixtures.state()
      const joined = {}
      presence.onJoin( (key, current, newPres) => {
        joined[key] = {current: current, newPres: newPres}
      })

      // Receive join event for u1
      presence.syncDiff({joins: joins, leaves: {}})
      assert.deepEqual(presence.state, joins)
      assert.deepEqual(joined, {
        u1: {current: undefined, newPres: joins.u1}
      })

      // Receive state including the previously handled join
      presence.syncState(newState)
      assert.deepEqual(presence.state, newState)
      assert.deepEqual(joined, {
        u1: {current: undefined, newPres: joins.u1},
        u2: {current: undefined, newPres: newState.u2},
        u3: {current: undefined, newPres: newState.u3},
      })
    })

    it("reapplies unmatched leave event on state", () => {
      const presence = new Presence()
      const leaves = {u1: {metas: [{id: 1, phx_ref: "1"}]}}
      const newState = fixtures.state()
      const expectedState = {u2: newState.u2, u3: newState.u3}

      // Receive leave event for u1
      presence.syncDiff({joins: {}, leaves: leaves})
      assert.deepEqual(presence.state, {})
      assert.deepEqual(presence.unhandledLeaves, leaves)

      // Receive state including the previously handled leave
      presence.syncState(newState)
      assert.deepEqual(presence.state, expectedState)
    })

    it("reapplies unmatched leave event on state, when some metas remain", () => {
      const presence = new Presence()
      const prevState = {u1: {metas: [{id: 1, phx_ref: "1.1"}]}}
      const leaves = {u1: {metas: [{id: 1, phx_ref: "1.2"}]}}

      const newState = {
        u1: {metas: [{id: 1, phx_ref: "1.1"}, {id: 1, phx_ref: "1.2"}]},
        u2: {metas: [{id: 2, phx_ref: "2"}]},
        u3: {metas: [{id: 3, phx_ref: "3"}]}
      }

      const expectedState = {u1: {metas: [{id: 1, phx_ref: "1.1"}]}, u2: newState.u2, u3: newState.u3}

      // Receive leave event for u1
      presence.state = prevState
      presence.syncDiff({joins: {}, leaves: leaves})
      assert.deepEqual(presence.state, prevState)
      assert.deepEqual(presence.unhandledLeaves, leaves)

      // Receive state including the previously handled leave
      presence.syncState(newState)
      assert.deepEqual(presence.state, expectedState)
    })
  })
})
