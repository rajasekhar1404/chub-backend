const assert = require('node:assert/strict')
const { test } = require('node:test')
const { normalizeHolidayUpload } = require('../utils/publicHolidayService')

test('normalizes a manual country/year holiday upload', () => {
    const upload = normalizeHolidayUpload({
        countryCode: 'in',
        countryName: ' India ',
        year: 2026,
        holidays: [
            {
                date: '2026-01-26',
                name: ' Republic Day ',
                types: ['Public']
            },
            {
                date: '2026-03-04',
                name: 'Regional Festival',
                types: ['Festival'],
                global: false,
                counties: ['IN-MH']
            }
        ]
    })

    assert.deepEqual(upload, {
        countryCode: 'IN',
        countryName: 'India',
        year: 2026,
        holidays: [
            {
                date: '2026-01-26',
                localName: 'Republic Day',
                name: 'Republic Day',
                countryCode: 'IN',
                fixed: false,
                global: true,
                counties: null,
                launchYear: null,
                types: ['Public']
            },
            {
                date: '2026-03-04',
                localName: 'Regional Festival',
                name: 'Regional Festival',
                countryCode: 'IN',
                fixed: false,
                global: false,
                counties: ['IN-MH'],
                launchYear: null,
                types: ['Festival']
            }
        ]
    })
})

test('rejects a holiday dated outside its uploaded year', () => {
    assert.throws(() => normalizeHolidayUpload({
        countryCode: 'IN',
        countryName: 'India',
        year: 2026,
        holidays: [{ date: '2027-01-01', name: 'New Year' }]
    }), /valid date in 2026/)
})

test('rejects invalid dates and regional codes', () => {
    const base = {
        countryCode: 'IN',
        countryName: 'India',
        year: 2026
    }

    assert.throws(() => normalizeHolidayUpload({
        ...base,
        holidays: [{ date: '2026-02-30', name: 'Invalid date' }]
    }), /valid date in 2026/)
    assert.throws(() => normalizeHolidayUpload({
        ...base,
        holidays: [{
            date: '2026-01-01',
            name: 'Invalid region',
            counties: ['US-CA']
        }]
    }), /valid IN region codes/)
})

test('rejects unsupported holiday types', () => {
    assert.throws(() => normalizeHolidayUpload({
        countryCode: 'IN',
        countryName: 'India',
        year: 2026,
        holidays: [{
            date: '2026-01-01',
            name: 'Unknown type',
            types: ['Unofficial']
        }]
    }), /supported holiday types/)
})

test('requires region codes for non-global holidays', () => {
    assert.throws(() => normalizeHolidayUpload({
        countryCode: 'IN',
        countryName: 'India',
        year: 2026,
        holidays: [{
            date: '2026-01-01',
            name: 'Regional holiday',
            global: false
        }]
    }), /must include at least one county\/region code/)
})
