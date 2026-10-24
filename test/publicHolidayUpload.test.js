const assert = require('node:assert/strict')
const { test } = require('node:test')
const PublicHolidayCountry = require('../models/publicHolidayCountry')
const PublicHolidayYear = require('../models/publicHolidayYear')
const {
    getPublicHolidays,
    normalizeHolidayUpload,
    savePublicHolidays
} = require('../utils/publicHolidayService')

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
                types: ['Unofficial'],
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
                counties: null,
                launchYear: null
            },
            {
                date: '2026-03-04',
                localName: 'Regional Festival',
                name: 'Regional Festival',
                countryCode: 'IN',
                fixed: false,
                counties: ['IN-MH'],
                launchYear: null
            }
        ]
    })
})

test('replaces the existing holiday list when uploading the same country and year', async () => {
    const originalCountryUpdateOne = PublicHolidayCountry.updateOne
    const originalYearUpdateOne = PublicHolidayYear.updateOne
    let storedHolidays = [{ date: '2026-01-01', name: 'Old holiday' }]
    let updateOptions

    PublicHolidayCountry.updateOne = async () => {}
    PublicHolidayYear.updateOne = async (filter, update, options) => {
        assert.deepEqual(filter, { countryCode: 'IN', year: 2026 })
        storedHolidays = update.$set.holidays
        updateOptions = options
    }

    try {
        await savePublicHolidays({
            countryCode: 'IN',
            countryName: 'India',
            year: 2026,
            holidays: [{ date: '2026-01-26', name: 'Republic Day' }]
        })

        assert.deepEqual(storedHolidays, [{ date: '2026-01-26', name: 'Republic Day' }])
        assert.equal(updateOptions.upsert, true)
    } finally {
        PublicHolidayCountry.updateOne = originalCountryUpdateOne
        PublicHolidayYear.updateOne = originalYearUpdateOne
    }
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

test('ignores legacy holiday type metadata', () => {
    const upload = normalizeHolidayUpload({
        countryCode: 'IN',
        countryName: 'India',
        year: 2026,
        holidays: [{
            date: '2026-01-01',
            name: 'Unknown type',
            types: ['Unofficial']
        }]
    })

    assert.equal(Object.hasOwn(upload.holidays[0], 'types'), false)
})

test('keeps legacy globally marked holidays country-wide after removing global metadata', async () => {
    const originalFindOne = PublicHolidayYear.findOne
    PublicHolidayYear.findOne = () => ({
        select: () => ({
            lean: async () => ({
                holidays: [{
                    date: '2026-01-26',
                    name: 'Republic Day',
                    global: true,
                    counties: ['IN-MH'],
                    types: ['Public']
                }]
            })
        })
    })

    try {
        assert.deepEqual(await getPublicHolidays('IN', 2026), [{
            date: '2026-01-26',
            name: 'Republic Day',
            counties: null
        }])
    } finally {
        PublicHolidayYear.findOne = originalFindOne
    }
})

test('ignores legacy global metadata and rejects empty region lists', () => {
    const upload = normalizeHolidayUpload({
        countryCode: 'IN',
        countryName: 'India',
        year: 2026,
        holidays: [{
            date: '2026-01-01',
            name: 'New Year',
            global: false
        }]
    })

    assert.equal(Object.hasOwn(upload.holidays[0], 'global'), false)
    assert.throws(() => normalizeHolidayUpload({
        countryCode: 'IN',
        countryName: 'India',
        year: 2026,
        holidays: [{
            date: '2026-01-01',
            name: 'Regional holiday',
            counties: []
        }]
    }), /counties must include at least one region code/)
})
