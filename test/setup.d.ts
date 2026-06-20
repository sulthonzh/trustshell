export declare function createTestDir(): string;
export declare function cleanupTestDir(dir: string): void;
export declare function createTestFile(dir: string, filename: string, content: string): string;
export declare const TEST_CODE_SNIPPETS: {
    javascript: string;
    javascriptWithIssues: string;
    python: string;
    pythonWithSecurityIssues: string;
    go: string;
    goWithIssues: string;
    rust: string;
    rustWithIssues: string;
    typescript: string;
    typescriptWithIssues: string;
};
export declare const SAMPLE_CONFIGS: {
    basic: {
        depth: "basic";
        testFrameworks: string[];
        security: {
            enabled: boolean;
            threshold: number;
            rules: string[];
        };
        performance: {
            enabled: boolean;
            maxExecutionTime: number;
            memoryLimit: string;
        };
        languages: {
            javascript: {
                testFramework: string;
                linting: boolean;
            };
        };
    };
    comprehensive: {
        depth: "comprehensive";
        testFrameworks: string[];
        security: {
            enabled: boolean;
            threshold: number;
            rules: string[];
        };
        performance: {
            enabled: boolean;
            maxExecutionTime: number;
            memoryLimit: string;
        };
        languages: {
            javascript: {
                testFramework: string;
                linting: boolean;
            };
            python: {
                testFramework: string;
                linting: boolean;
            };
        };
    };
    deep: {
        depth: "deep";
        testFrameworks: string[];
        security: {
            enabled: boolean;
            threshold: number;
            rules: string[];
        };
        performance: {
            enabled: boolean;
            maxExecutionTime: number;
            memoryLimit: string;
        };
        languages: {
            javascript: {
                testFramework: string;
                linting: boolean;
            };
            python: {
                testFramework: string;
                linting: boolean;
            };
            go: {
                testFramework: string;
                linting: boolean;
            };
        };
    };
};
//# sourceMappingURL=setup.d.ts.map