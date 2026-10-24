const express = require('express')
const router = express.Router()
const {
    getPublicHolidayCountries,
    getPublicHolidaysForYear,
    getPublicHolidayRegions,
    uploadPublicHolidays
} = require('../controllers/publicHolidayController')
const authorizeHolidayUpload = require('../middlewares/authorizeHolidayUpload')

router.get('/countries', getPublicHolidayCountries)
router.get('/regions/:countryCode', getPublicHolidayRegions)
router.get('/:year/:countryCode', getPublicHolidaysForYear)
router.put('/', authorizeHolidayUpload, uploadPublicHolidays)

module.exports = router
