// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

// Commitlint configuration for Gemini Oracle

export default {
    extends: ["@commitlint/config-conventional"],
    rules: {
        // Conventional commit type validation
        "type-enum": [
            2,
            "always",
            [
                "feat",     // New feature
                "fix",      // Bug fix
                "docs",     // Documentation
                "style",    // Formatting
                "refactor", // Code restructuring
                "test",     // Tests
                "chore",    // Maintenance
                "ci",       // CI/CD
                "perf",     // Performance
                "build",    // Build system
                "revert",   // Revert
            ],
        ],

        // Scope validation
        "scope-enum": [
            2,
            "always",
            [
                // Core areas
                "web",       // Next.js pages
                "api",       // API routes
                "lib",       // Library code
                "ui",        // UI components
                "db",        // Database
                "storage",   // MinIO/S3

                // Infrastructure
                "deps",      // Dependencies
                "config",    // Configuration
                "ci",        // GitHub Actions
                "docker",    // Container config

                // Other
                "docs",      // Documentation
                "tests",     // Testing
            ],
        ],

        // Message format
        "subject-case": [2, "never", ["pascal-case", "upper-case"]],
        "subject-empty": [2, "never"],
        "subject-full-stop": [2, "never", "."],
        "subject-max-length": [2, "always", 72],
        "body-max-line-length": [2, "always", 100],
        "header-max-length": [2, "always", 100],

        // AI agent trailer validation
        "ai-agent-trailer": [1, "always"],
    },

    parserPreset: {
        parserOpts: {
            headerPattern: /^(\w*)(?:\(([^)]*)\))?: (.*)$/,
            headerCorrespondence: ["type", "scope", "subject"],
        },
    },

    plugins: [
        {
            rules: {
                "ai-agent-trailer": (parsed) => {
                    const { raw } = parsed;
                    const hasAIAgent = /AI-Agent:\s*\w+/.test(raw);
                    const hasHumanInvolvement =
                        /Human-Involvement:\s*(full|reviewed|approved|automated)/.test(raw);

                    if (parsed.merge || parsed.revert) {
                        return [true];
                    }

                    if (hasAIAgent && !hasHumanInvolvement) {
                        return [false, "AI-Agent commits require Human-Involvement trailer"];
                    }

                    return [true];
                },
            },
        },
    ],
};
