const PublicHolidayCountry = require('../models/publicHolidayCountry')
const PublicHolidayYear = require('../models/publicHolidayYear')

const ALLOWED_HOLIDAY_TYPES = new Set([
    'Public',
    'Festival',
    'Bank',
    'School',
    'Authorities',
    'Optional',
    'Observance'
])
const MAX_HOLIDAYS_PER_UPLOAD = 1000

const normalizeHolidayUpload = (body) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new Error('The request body must be a JSON object.')
    }

    const countryCode = typeof body.countryCode === 'string'
        ? body.countryCode.trim().toUpperCase()
        : ''
    const countryName = typeof body.countryName === 'string' ? body.countryName.trim() : ''
    const year = Number(body.year)

    if (!/^[A-Z]{2}$/.test(countryCode)) {
        throw new Error('countryCode must be a two-letter country code.')
    }
    if (!countryName || countryName.length > 100) {
        throw new Error('countryName must contain between 1 and 100 characters.')
    }
    if (!Number.isInteger(year) || year < 1 || year > 9999) {
        throw new Error('year must be an integer between 1 and 9999.')
    }
    if (!Array.isArray(body.holidays) || body.holidays.length > MAX_HOLIDAYS_PER_UPLOAD) {
        throw new Error(`holidays must be an array with no more than ${MAX_HOLIDAYS_PER_UPLOAD} entries.`)
    }

    const holidays = body.holidays.map((holiday, index) => {
        const entryNumber = index + 1
        if (!holiday || typeof holiday !== 'object' || Array.isArray(holiday)) {
            throw new Error(`Holiday ${entryNumber} must be an object.`)
        }

        const { date, name } = holiday
        if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            throw new Error(`Holiday ${entryNumber} date must use YYYY-MM-DD format.`)
        }
        const parsedDate = new Date(`${date}T00:00:00.000Z`)
        if (
            Number.isNaN(parsedDate.getTime()) ||
            parsedDate.toISOString().slice(0, 10) !== date ||
            parsedDate.getUTCFullYear() !== year
        ) {
            throw new Error(`Holiday ${entryNumber} date must be a valid date in ${year}.`)
        }
        if (typeof name !== 'string' || !name.trim() || name.trim().length > 200) {
            throw new Error(`Holiday ${entryNumber} name must contain between 1 and 200 characters.`)
        }

        const localName = holiday.localName === undefined ? name.trim() : holiday.localName
        if (typeof localName !== 'string' || !localName.trim() || localName.trim().length > 200) {
            throw new Error(`Holiday ${entryNumber} localName must contain between 1 and 200 characters.`)
        }

        const types = holiday.types === undefined ? ['Public'] : holiday.types
        if (
            !Array.isArray(types) ||
            types.length === 0 ||
            types.some(type => typeof type !== 'string' || !ALLOWED_HOLIDAY_TYPES.has(type))
        ) {
            throw new Error(`Holiday ${entryNumber} types must contain supported holiday types.`)
        }

        const counties = holiday.counties === undefined || holiday.counties === null
            ? null
            : holiday.counties
        if (
            counties !== null &&
            (!Array.isArray(counties) ||
                counties.some(county =>
                    typeof county !== 'string' ||
                    !new RegExp(`^${countryCode}-[A-Z0-9]{1,3}$`).test(county)
                ))
        ) {
            throw new Error(`Holiday ${entryNumber} counties must contain valid ${countryCode} region codes.`)
        }
        if (holiday.global !== undefined && typeof holiday.global !== 'boolean') {
            throw new Error(`Holiday ${entryNumber} global must be true or false.`)
        }
        const global = holiday.global ?? counties === null
        if (!global && (!Array.isArray(counties) || counties.length === 0)) {
            throw new Error(`Regional holiday ${entryNumber} must include at least one county/region code.`)
        }
        if (holiday.fixed !== undefined && typeof holiday.fixed !== 'boolean') {
            throw new Error(`Holiday ${entryNumber} fixed must be true or false.`)
        }
        if (
            holiday.launchYear !== undefined &&
            holiday.launchYear !== null &&
            (!Number.isInteger(holiday.launchYear) || holiday.launchYear < 1 || holiday.launchYear > year)
        ) {
            throw new Error(`Holiday ${entryNumber} launchYear must be an integer no later than ${year}.`)
        }

        return {
            date,
            localName: localName.trim(),
            name: name.trim(),
            countryCode,
            fixed: holiday.fixed ?? false,
            global,
            counties,
            launchYear: holiday.launchYear ?? null,
            types
        }
    })

    return { countryCode, countryName, year, holidays }
}

const getCountryCatalog = async () => {
    const uploadedCountries = await PublicHolidayYear.distinct('countryCode', { source: 'manual' })
    if (uploadedCountries.length === 0) return []

    return PublicHolidayCountry.find({ countryCode: { $in: uploadedCountries } })
        .sort({ name: 1 })
        .select({ _id: 0, countryCode: 1, name: 1 })
        .lean()
}

const getPublicHolidays = async (countryCode, year) => {
    const record = await PublicHolidayYear.findOne({
        countryCode,
        year,
        source: 'manual'
    }).select({ _id: 0, holidays: 1 }).lean()

    return record ? record.holidays : null
}

const getHolidayRegions = async (countryCode) => {
    const records = await PublicHolidayYear.find(
        { countryCode, source: 'manual' },
        { 'holidays.counties': 1, _id: 0 }
    ).lean()
    const regions = new Set()

    for (const record of records) {
        for (const holiday of record.holidays || []) {
            for (const regionCode of holiday.counties || []) {
                regions.add(regionCode)
            }
        }
    }

    return [...regions].sort()
}

const savePublicHolidays = async ({ countryCode, countryName, year, holidays }) => {
    await PublicHolidayCountry.updateOne(
        { countryCode },
        { $set: { name: countryName } },
        { upsert: true, runValidators: true }
    )

    const filter = { countryCode, year }
    const update = {
        $set: {
            holidays,
            source: 'manual',
            uploadedAt: new Date()
        }
    }
    try {
        await PublicHolidayYear.updateOne(filter, update, { upsert: true, runValidators: true })
    } catch (error) {
        if (error.code !== 11000) throw error
        await PublicHolidayYear.updateOne(filter, update, { runValidators: true })
    }
}

module.exports = {
    getCountryCatalog,
    getPublicHolidays,
    getHolidayRegions,
    normalizeHolidayUpload,
    savePublicHolidays
}
