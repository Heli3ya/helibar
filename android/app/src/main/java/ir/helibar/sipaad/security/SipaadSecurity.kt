package ir.helibar.sipaad.security

import java.security.MessageDigest
import kotlin.random.Random

/**
 * HeliBar (هلی‌بار) - Official SIPAAD / UTCMS Security Signature Generator
 * Strictly implements Section 17 of "UTCM-WS-BOL-GUIDE":
 *
 * Algorithm:
 * 1. Generate an 8-digit random Salt (between 10,000,000 and 99,999,999) if not provided.
 * 2. Inner Hash: SHA-512 of Password (lowercase hex).
 * 3. Raw String: CompanyCode + InnerHash + Salt.
 * 4. Outer Hash: SHA-512 of Raw String (lowercase hex).
 * 5. Returns Salt and HashedValue for the request authentication envelope.
 */
object SipaadSecurity {

    data class HashResult(
        val companyCode: String,
        val salt: Long,
        val hashedValue: String
    )

    /**
     * Exact implementation of Section 17 GetSHA512Hash
     * @param companyCode The municipal transport company code (e.g. "24981")
     * @param password Company or Driver secret password in UTF-8
     * @param explicitSalt Optional fixed salt (useful for unit tests)
     */
    fun getSHA512Hash(
        companyCode: String,
        password: String,
        explicitSalt: Long? = null
    ): HashResult {
        val cleanCompany = companyCode.trim()
        val cleanPassword = password.trim()
        val salt = explicitSalt ?: Random.nextLong(10_000_000L, 100_000_000L)

        // Step 1: Inner SHA-512 on plain password
        val innerPasswordHash = sha512Hex(cleanPassword)

        // Step 2: Concatenate CompanyCode + InnerHash + Salt
        val combined = "$cleanCompany$innerPasswordHash$salt"

        // Step 3: Outer SHA-512 on combined string
        val finalHashedValue = sha512Hex(combined)

        return HashResult(
            companyCode = cleanCompany,
            salt = salt,
            hashedValue = finalHashedValue
        )
    }

    private fun sha512Hex(input: String): String {
        val md = MessageDigest.getInstance("SHA-512")
        val bytes = md.digest(input.toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }
}
