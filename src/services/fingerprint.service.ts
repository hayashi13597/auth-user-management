import { createHash } from "node:crypto";

interface FingerprintData {
	userAgent?: string;
	ipAddress?: string;
}

class FingerprintService {
	/**
	 * Generate a fingerprint hash from device/browser metadata
	 * Used to detect suspicious token usage from different devices
	 */
	generate(data: FingerprintData): string {
		const { userAgent = "", ipAddress = "" } = data;

		// Create a hash of the combined metadata
		const fingerprint = createHash("sha256")
			.update(`${userAgent}:${ipAddress}`)
			.digest("hex");

		return fingerprint;
	}

	/**
	 * Compare two fingerprints
	 * Returns a similarity score (0-1)
	 * 1 = exact match, 0 = completely different
	 */
	compare(fingerprint1: string, fingerprint2: string): number {
		if (fingerprint1 === fingerprint2) {
			return 1;
		}
		return 0;
	}

	/**
	 * Check if fingerprint has changed significantly
	 * Used to detect potential token theft
	 */
	hasSignificantChange(
		originalData: FingerprintData,
		currentData: FingerprintData,
	): boolean {
		// IP address change is always significant
		if (
			originalData.ipAddress &&
			currentData.ipAddress &&
			originalData.ipAddress !== currentData.ipAddress
		) {
			// Check if it's a different network (simplified check)
			const originalPrefix = this.getIPPrefix(originalData.ipAddress);
			const currentPrefix = this.getIPPrefix(currentData.ipAddress);

			if (originalPrefix !== currentPrefix) {
				return true;
			}
		}

		// User agent change is significant
		if (
			originalData.userAgent &&
			currentData.userAgent &&
			!this.isSimilarUserAgent(originalData.userAgent, currentData.userAgent)
		) {
			return true;
		}

		return false;
	}

	/**
	 * Get IP prefix (first 3 octets for IPv4)
	 * Used for rough network comparison
	 */
	private getIPPrefix(ip: string): string {
		// Handle IPv4
		if (ip.includes(".")) {
			const parts = ip.split(".");
			return parts.slice(0, 3).join(".");
		}

		// Handle IPv6 (use first 4 segments)
		if (ip.includes(":")) {
			const parts = ip.split(":");
			return parts.slice(0, 4).join(":");
		}

		return ip;
	}

	/**
	 * Check if two user agents are from the same browser/platform
	 * Allows for minor version differences
	 */
	private isSimilarUserAgent(ua1: string, ua2: string): boolean {
		// Extract browser and OS info (simplified)
		const browser1 = this.extractBrowserInfo(ua1);
		const browser2 = this.extractBrowserInfo(ua2);

		return browser1.browser === browser2.browser && browser1.os === browser2.os;
	}

	/**
	 * Extract browser and OS info from user agent
	 */
	private extractBrowserInfo(userAgent: string): {
		browser: string;
		os: string;
	} {
		let browser = "unknown";
		let os = "unknown";

		// Detect browser
		if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
			browser = "chrome";
		} else if (userAgent.includes("Firefox")) {
			browser = "firefox";
		} else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
			browser = "safari";
		} else if (userAgent.includes("Edg")) {
			browser = "edge";
		}

		// Detect OS
		if (userAgent.includes("Windows")) {
			os = "windows";
		} else if (userAgent.includes("Mac OS")) {
			os = "macos";
		} else if (userAgent.includes("Linux")) {
			os = "linux";
		} else if (userAgent.includes("Android")) {
			os = "android";
		} else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
			os = "ios";
		}

		return { browser, os };
	}
}

export const fingerprintService = new FingerprintService();
