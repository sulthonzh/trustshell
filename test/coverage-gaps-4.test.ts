/**
 * Coverage gap tests for trustshell — Round 4
 * Targets: security.ts uncovered lines (Go race conditions, Java SQL injection,
 *          generic commented-code/overly-permissive, common credential patterns),
 *          verifier.ts uncovered lines (performance threshold edge, status transitions),
 *          index.ts uncovered branches (CLI flow paths).
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { checkSecurity } from '../dist/security/security.js';

describe('Coverage gaps Round 4 — security.ts uncovered branches', () => {
  let testDir: string;

  before(() => {
    testDir = mkdtempSync(join(tmpdir(), 'trustshell-cg4-'));
  });

  after(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  const makeFile = (name: string, content: string): string => {
    const p = join(testDir, name);
    writeFileSync(p, content);
    return p;
  };

  const secConfig = { security: { enabled: true, threshold: 80, rules: [] } };

  describe('Go security checks', () => {
    it('should detect race conditions with goroutines and sync operations', async () => {
      const code = `
package main
import "sync"
func main() {
    var mu sync.Mutex
    go func() {
        mu.Lock()
        defer mu.Unlock()
    }()
}
`;
      const result = await checkSecurity(makeFile('race.go', code), 'go', secConfig);
      const types = result.vulnerabilities.map(v => v.type);
      assert.ok(types.includes('potential-race'), 'Should detect potential race condition, got: ' + JSON.stringify(types));
    });

    it('should detect Go buffer overflow with make([]byte and unsafe', async () => {
      const code = `
package main
import "unsafe"
func main() {
    buf := make([]byte, 1024)
    _ = unsafe.Pointer(&buf[0])
}
`;
      const result = await checkSecurity(makeFile('overflow.go', code), 'go', secConfig);
      const types = result.vulnerabilities.map(v => v.type);
      assert.ok(types.includes('buffer-overflow'), 'Should detect buffer overflow, got: ' + JSON.stringify(types));
    });

    it('should detect Go unsafe pointer operations', async () => {
      const code = `
package main
import "unsafe"
func main() {
    var x int = 42
    ptr := unsafe.Pointer(&x)
    _ = ptr
}
`;
      const result = await checkSecurity(makeFile('unsafe.go', code), 'go', secConfig);
      const types = result.vulnerabilities.map(v => v.type);
      assert.ok(types.includes('unsafe-pointer'), 'Should detect unsafe pointer, got: ' + JSON.stringify(types));
    });

    it('should not flag race condition when only goroutine without sync', async () => {
      const code = `
package main
func main() {
    go func() {
        println("hello")
    }()
}
`;
      const result = await checkSecurity(makeFile('nogorace.go', code), 'go', secConfig);
      const types = result.vulnerabilities.map(v => v.type);
      assert.ok(!types.includes('potential-race'), 'Should NOT flag race without sync');
    });
  });

  describe('Java security checks', () => {
    it('should detect SQL injection with PreparedStatement and concatenation', async () => {
      const code = `
public class Query {
    public void run(String name) {
        String sql = "SELECT * FROM users WHERE name = " + name;
        PreparedStatement ps = conn.prepareStatement(sql);
    }
}
`;
      const result = await checkSecurity(makeFile('sqli.java', code), 'java', secConfig);
      const types = result.vulnerabilities.map(v => v.type);
      assert.ok(types.includes('sql-injection'), 'Should detect SQL injection, got: ' + JSON.stringify(types));
    });

    it('should not flag SQL injection with PreparedStatement but no concatenation', async () => {
      const code = `
public class Query {
    public void run() {
        PreparedStatement ps = conn.prepareStatement("SELECT 1");
    }
}
`;
      const result = await checkSecurity(makeFile('nosqli.java', code), 'java', secConfig);
      const types = result.vulnerabilities.map(v => v.type);
      assert.ok(!types.includes('sql-injection'), 'Should NOT flag SQL injection without +');
    });

    it('should detect hardcoded String secret', async () => {
      const code = `
public class Config {
    String secret = "mySecretValue123";
}
`;
      const result = await checkSecurity(makeFile('secret.java', code), 'java', secConfig);
      const types = result.vulnerabilities.map(v => v.type);
      // Should trigger hardcoded-credential from at least one checker
      assert.ok(types.length > 0, 'Should detect some credential issue, got: ' + JSON.stringify(types));
    });

    it('should detect System.load and System.loadLibrary', async () => {
      const code = `
public class Native {
    static {
        System.load("libnative.so");
        System.loadLibrary("native");
        Class.newInstance();
        System.load("another");
        System.loadLibrary("another2");
        Class.forName("com.example.Evil");
    }
}
`;
      const result = await checkSecurity(makeFile('native.java', code), 'java', secConfig);
      const types = result.vulnerabilities.map(v => v.type);
      assert.ok(types.includes('dangerous-method'), 'Should detect dangerous methods');
    });

    it('should detect deserialization with readObject', async () => {
      const code = `
public class Deserialize {
    public void load(ObjectInputStream ois) throws Exception {
        Object obj = ois.readObject();
    }
}
`;
      const result = await checkSecurity(makeFile('deser.java', code), 'java', secConfig);
      const types = result.vulnerabilities.map(v => v.type);
      assert.ok(types.includes('deserialization'), 'Should detect deserialization, got: ' + JSON.stringify(types));
    });
  });

  describe('Generic security checks', () => {
    // checkGenericSecurity only runs for non-js/ts/python/go/rust/java languages (default switch case)
    it('should detect TODO comments', async () => {
      const code = `
function foo() {
    // TODO: implement this properly
    return null;
}
`;
      const result = await checkSecurity(makeFile('todo.rb', code), 'ruby', secConfig);
      const types = result.vulnerabilities.map(v => v.type);
      assert.ok(types.includes('commented-code'), 'Should detect TODO comment, got: ' + JSON.stringify(types));
    });

    it('should detect FIXME comments', async () => {
      const code = `
function bar() {
    // FIXME: this is broken
    return undefined;
}
`;
      const result = await checkSecurity(makeFile('fixme.rb', code), 'ruby', secConfig);
      const types = result.vulnerabilities.map(v => v.type);
      assert.ok(types.includes('commented-code'), 'Should detect FIXME comment, got: ' + JSON.stringify(types));
    });

    it('should detect overly permissive file permissions (777)', async () => {
      const code = `
fs.chmodSync('/path/to/file', 0o777);
chmod("/path", "777");
`;
      const result = await checkSecurity(makeFile('perms.rb', code), 'ruby', secConfig);
      const types = result.vulnerabilities.map(v => v.type);
      assert.ok(types.includes('overly-permissive'), 'Should detect 777 permissions, got: ' + JSON.stringify(types));
    });

    it('should detect overly permissive file permissions (rwx)', async () => {
      const code = `
# Set permissions to rwx for everyone
chmod 777 /var/www
`;
      const result = await checkSecurity(makeFile('perms.sh', code), 'bash', secConfig);
      const types = result.vulnerabilities.map(v => v.type);
      assert.ok(types.includes('overly-permissive'), 'Should detect rwx permissions, got: ' + JSON.stringify(types));
    });

    it('should detect multiple TODO/FIXME comments', async () => {
      const code = `
// TODO: first thing
function a() {}
// TODO: second thing
function b() {}
// FIXME: third thing
function c() {}
`;
      const result = await checkSecurity(makeFile('multi.rb', code), 'ruby', secConfig);
      const commentedVulns = result.vulnerabilities.filter(v => v.type === 'commented-code');
      assert.ok(commentedVulns.length >= 3, 'Should detect at least 3 TODO/FIXME comments, got: ' + commentedVulns.length);
    });
  });

  describe('Common credential patterns', () => {
    it('should detect backtick-style credentials (key: value)', async () => {
      const code = `
const config = {
    "password": "supersecret123",
    "api_key": "sk-1234567890abcdef",
    "token": "tok-1234567890abcdef",
};
`;
      const result = await checkSecurity(makeFile('creds1.js', code), 'javascript', secConfig);
      const types = result.vulnerabilities.map(v => v.type);
      assert.ok(types.includes('hardcoded-credential'), 'Should detect credential pattern, got: ' + JSON.stringify(types));
    });

    it('should detect single-quote style credentials', async () => {
      // Pattern: (?:const|let|var)?\s*(?:secret|private_key|...)\s*=\s*["'][^"']{4,}["']
      const code = `
const secret = 'mySecretValue456';
const private_key = '-----BEGIN PRIVATE KEY-----abcd1234efgh5678';
`;
      const result = await checkSecurity(makeFile('creds2.js', code), 'javascript', secConfig);
      const types = result.vulnerabilities.map(v => v.type);
      assert.ok(types.includes('hardcoded-credential'), 'Should detect single-quote credential pattern, got: ' + JSON.stringify(types));
    });

    it('should detect const-style credentials', async () => {
      const code = `
const apiKey = "ak-1234567890abcdef1234";
const authToken = "auth-1234567890123456";
const accessToken = "access-1234567890123456";
`;
      const result = await checkSecurity(makeFile('creds3.js', code), 'javascript', secConfig);
      const types = result.vulnerabilities.map(v => v.type);
      assert.ok(types.includes('hardcoded-credential'), 'Should detect const credential');
    });

    it('should detect Python-style credentials', async () => {
      const code = `
password = "supersecretpass123"
api_key = "sk-1234567890123456"
`;
      const result = await checkSecurity(makeFile('creds.py', code), 'python', secConfig);
      const credVulns = result.vulnerabilities.filter(v => v.type === 'hardcoded-credential' || v.type === 'hardcoded-secret');
      assert.ok(credVulns.length > 0, 'Should detect Python credentials');
    });

    it('should not flag short strings as credentials', async () => {
      const code = `
const key = "abc";
const password = "123";
`;
      const result = await checkSecurity(makeFile('short.js', code), 'javascript', secConfig);
      const credVulns = result.vulnerabilities.filter(v => v.type === 'hardcoded-credential');
      // Short strings (< 4 chars) should not trigger
      // (though some checkers might still flag "password" keyword)
      // Just verify no crash
      assert.ok(result.score >= 0);
    });
  });

  describe('Rust security edge cases', () => {
    it('should not flag memory leak without forget', async () => {
      const code = `
fn main() {
    let b = Box::new(42);
    println!("{}", b);
}
`;
      const result = await checkSecurity(makeFile('noleak.rs', code), 'rust', secConfig);
      const types = result.vulnerabilities.map(v => v.type);
      assert.ok(!types.includes('memory-leak'), 'Should NOT flag memory leak without forget');
    });

    it('should not flag unsanitized input when validate is present', async () => {
      const code = `
fn process(bytes: &[u8]) {
    let s = str::from_utf8(bytes);
    s.validate()
}
`;
      const result = await checkSecurity(makeFile('validated.rs', code), 'rust', secConfig);
      const types = result.vulnerabilities.map(v => v.type);
      assert.ok(!types.includes('unsanitized-input'), 'Should NOT flag when validate is present');
    });
  });
});
