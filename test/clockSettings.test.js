const assert = require('node:assert/strict')
const { test } = require('node:test')
const ClockSettings = require('../models/clock')

test('clock task and holiday visibility default to off and can be enabled', () => {
    const defaultSettings = new ClockSettings({ userId: 'user-1' })
    assert.equal(defaultSettings.showTasks, false)
    assert.equal(defaultSettings.showHolidays, false)

    const enabledSettings = new ClockSettings({
        userId: 'user-1',
        showTasks: true,
        showHolidays: true
    })
    assert.equal(enabledSettings.showTasks, true)
    assert.equal(enabledSettings.showHolidays, true)
})
