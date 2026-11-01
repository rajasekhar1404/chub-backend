const asyncHandler = require('express-async-handler')
const { BAD_REQUEST, OK } = require('../constants/statusCodes')
const {
    getCountryCatalog,
    getPublicHolidays,
    getHolidayRegions,
    normalizeHolidayUpload,
    savePublicHolidays
} = require('../utils/publicHolidayService')

const getPublicHolidayCountries = asyncHandler(async (req, res) => {
    res.json(await getCountryCatalog())
})

const getPublicHolidaysForYear = asyncHandler(async (req, res) => {
    const year = Number(req.params.year)
    const countryCode = req.params.countryCode.toUpperCase()

    if (
        !Number.isInteger(year) ||
        year < 1 ||
        year > 9999 ||
        !/^[A-Z]{2}$/.test(countryCode)
    ) {
        res.status(BAD_REQUEST)
        throw new Error('A valid year and two-letter country code are required.')
    }

    const holidays = await getPublicHolidays(countryCode, year)
    if (holidays === null) {
        return res.json([])
    }
    res.json(holidays)
})

const getPublicHolidayRegions = asyncHandler(async (req, res) => {
    const countryCode = req.params.countryCode.toUpperCase()
    if (!/^[A-Z]{2}$/.test(countryCode)) {
        return res.status(BAD_REQUEST).json({ message: 'A two-letter country code is required.' })
    }

    res.json(await getHolidayRegions(countryCode))
})

const uploadPublicHolidays = asyncHandler(async (req, res) => {
    let upload
    try {
        upload = normalizeHolidayUpload(req.body)
    } catch (error) {
        return res.status(BAD_REQUEST).json({ message: error.message })
    }

    await savePublicHolidays(upload)
    res.status(OK).json({
        message: 'Public holidays uploaded.',
        countryCode: upload.countryCode,
        countryName: upload.countryName,
        year: upload.year,
        holidayCount: upload.holidays.length
    })
})

module.exports = {
    getPublicHolidayCountries,
    getPublicHolidaysForYear,
    getPublicHolidayRegions,
    uploadPublicHolidays
}
