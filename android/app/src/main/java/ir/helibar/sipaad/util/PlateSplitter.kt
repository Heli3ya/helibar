package ir.helibar.sipaad.util

/**
 * Helper to split Iranian license plate strings into the 4 ASP.NET tags:
 * RqsirTag1: 2-digit part 1 (e.g., "23")
 * RqsirTag2: 2-digit province code (e.g., "78" from "ایران 78")
 * RqsirTag3: Letter numerical code or letter string (e.g., "21" for "ع" or "ع")
 * RqsirTag4: 3-digit part 2 (e.g., "783")
 *
 * Example input representations supported:
 * - "23ع783-78"
 * - "23 ع 783 ایران 78"
 * - "23-ع-783-78"
 */
data class IranianPlateTags(
    val tag1: String, // 2 digits (e.g. 23)
    val tag2: String, // Province 2 digits (e.g. 78)
    val tag3: String, // Letter code or letter (e.g. 21 or ع)
    val tag4: String  // 3 digits (e.g. 783)
)

object PlateSplitter {

    // Mapping Persian plate letters to UTCMS ASP.NET Tag3 codes if numeric index is required
    private val letterCodeMap = mapOf(
        "الف" to "1",
        "ب" to "2",
        "پ" to "3",
        "ت" to "4",
        "ث" to "5",
        "ج" to "6",
        "د" to "7",
        "ز" to "8",
        "س" to "9",
        "ش" to "10",
        "ص" to "11",
        "ط" to "12",
        "ع" to "21", // Very common for public freight/taxis
        "ف" to "14",
        "ق" to "15",
        "ک" to "16",
        "گ" to "17",
        "ل" to "18",
        "م" to "19",
        "ن" to "20",
        "و" to "22",
        "ه" to "23",
        "ی" to "24"
    )

    /**
     * Splits full plate into 4 tags.
     * @param plateStr Formatted or raw plate string
     */
    fun splitPlate(plateStr: String): IranianPlateTags {
        // Clean Persian/Arabic numbers to English
        val normalized = plateStr
            .replace("ایران", "")
            .replace("Iran", "")
            .replace("-", " ")
            .replace("_", " ")
            .trim()
            .map { ch ->
                when (ch) {
                    in '۰'..'۹' -> (ch - '۰' + '0'.code).toChar()
                    in '٠'..'٩' -> (ch - '٠' + '0'.code).toChar()
                    else -> ch
                }
            }
            .joinToString("")

        // Regex for Iranian plate: (\d{2})\s*([^\d\s]+)\s*(\d{3})\s*(\d{2})
        val regex = Regex("""(\d{2})\s*([^\d\s]+)\s*(\d{3})\s*(\d{2})""")
        val match = regex.find(normalized)

        if (match != null) {
            val (part1, letter, part2, province) = match.destructured
            val tag3Code = letterCodeMap[letter.trim()] ?: letter.trim()
            return IranianPlateTags(
                tag1 = part1.trim(),
                tag2 = province.trim(),
                tag3 = tag3Code,
                tag4 = part2.trim()
            )
        }

        // Fallback tokenization if plate structure is separated by spaces
        val tokens = normalized.split(Regex("""\s+""")).filter { it.isNotBlank() }
        if (tokens.size >= 4) {
            val p1 = tokens[0]
            val pLetter = tokens[1]
            val p2 = tokens[2]
            val pProvince = tokens[3]
            val tag3Code = letterCodeMap[pLetter] ?: pLetter
            return IranianPlateTags(
                tag1 = p1,
                tag2 = pProvince,
                tag3 = tag3Code,
                tag4 = p2
            )
        }

        // Default fallback with sample values
        return IranianPlateTags(
            tag1 = "23",
            tag2 = "78",
            tag3 = "21",
            tag4 = "783"
        )
    }
}
