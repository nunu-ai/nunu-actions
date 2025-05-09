"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@actions/core");
var child_process_1 = require("child_process");
var promises_1 = require("fs/promises");
var process_1 = require("process");
var TMP_PREFIX = "/tmp/nix-cache-action-";
function system(cmd) {
    var child = (0, child_process_1.spawn)("/bin/bash", ["-c", cmd]);
    return new Promise(function (resolve, reject) {
        child.on("close", function (code) {
            if (code === null)
                reject(new Error("command ".concat(cmd, " didn't exit correctly")));
            else if (code !== 0)
                reject(new Error("command ".concat(cmd, " exited with code ").concat(code)));
            resolve();
        });
    });
}
function setupAwsCreds(awsAccessKeyId, awsSecretAccessKey) {
    return __awaiter(this, void 0, void 0, function () {
        var credsPath, credsFileContent, rootFolder;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    credsPath = "".concat(TMP_PREFIX, "aws-credentials");
                    credsFileContent = "[default]\naws_access_key_id = ".concat(awsAccessKeyId, "\naws_secret_access_key = ").concat(awsSecretAccessKey, "\n");
                    return [4 /*yield*/, (0, promises_1.writeFile)(credsPath, credsFileContent, { mode: 384 })];
                case 1:
                    _a.sent();
                    (0, core_1.debug)("Wrote ".concat(credsPath));
                    rootFolder = process_1.platform === "darwin" ? "/var/root/.aws" : "/root/.aws";
                    return [4 /*yield*/, system("sudo mkdir -p ".concat(rootFolder))];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, system("sudo cp ".concat(credsPath, " ").concat(rootFolder, "/credentials"))];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, system("mkdir -p $HOME/.aws")];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, system("sudo cp ".concat(credsPath, " $HOME/.aws/credentials"))];
                case 5:
                    _a.sent();
                    return [2 /*return*/, credsPath];
            }
        });
    });
}
function setupPostBuildHook(credsPath, cache) {
    return __awaiter(this, void 0, void 0, function () {
        var fname, hook;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fname = "".concat(TMP_PREFIX, "post-build-hook");
                    hook = "#!/bin/bash\nset -euo pipefail\necho \"Uploading paths: $OUT_PATHS\" 1>&2\nexport AWS_SHARED_CREDENTIALS_FILE='".concat(credsPath, "'\n\necho \"$OUT_PATHS\" | xargs /nix/var/nix/profiles/default/bin/nix \\\n  --extra-experimental-features nix-command \\\n  copy --to '").concat(cache, "' 1>&2\n");
                    return [4 /*yield*/, (0, promises_1.writeFile)(fname, hook, { mode: 493 })];
                case 1:
                    _a.sent();
                    return [2 /*return*/, fname];
            }
        });
    });
}
function setupSecretKeys(secretKeys) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.all(secretKeys.map(function (k, i) {
                        return (function () { return __awaiter(_this, void 0, void 0, function () {
                            var fname;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        fname = "".concat(TMP_PREFIX, "-secret-key-").concat(i);
                                        return [4 /*yield*/, (0, promises_1.writeFile)(fname, k, { mode: 384 })];
                                    case 1:
                                        _a.sent();
                                        (0, core_1.debug)("Wrote ".concat(fname));
                                        return [2 /*return*/, fname];
                                }
                            });
                        }); })();
                    }))];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function generate(input) {
    return __awaiter(this, void 0, void 0, function () {
        var substituters, trustedPublicKeys, secretKeys, awsAccessKeyId, awsSecretAccessKey, credsPath, hookPath, secretKeyFiles, config;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    substituters = input.substituters, trustedPublicKeys = input.trustedPublicKeys, secretKeys = input.secretKeys, awsAccessKeyId = input.awsAccessKeyId, awsSecretAccessKey = input.awsSecretAccessKey;
                    return [4 /*yield*/, setupAwsCreds(awsAccessKeyId, awsSecretAccessKey)];
                case 1:
                    credsPath = _a.sent();
                    return [4 /*yield*/, setupPostBuildHook(credsPath, substituters[0])];
                case 2:
                    hookPath = _a.sent();
                    return [4 /*yield*/, setupSecretKeys(secretKeys)];
                case 3:
                    secretKeyFiles = _a.sent();
                    config = "extra-substituters = ".concat(substituters.join(" "), "\nextra-trusted-public-keys = ").concat(trustedPublicKeys.join(" "), "\nextra-secret-key-files = ").concat(secretKeyFiles.join(" "), "\npost-build-hook = ").concat(hookPath, "\n\n");
                    return [2 /*return*/, { credsPath: credsPath, config: config }];
            }
        });
    });
}
function getInputListRequired(name) {
    return (0, core_1.getInput)(name, { required: true }).trim().split(" ");
}
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, newConfig, credsPath, configFName;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    (0, core_1.info)("Generating configuration...");
                    return [4 /*yield*/, generate({
                            substituters: getInputListRequired("substituters"),
                            trustedPublicKeys: getInputListRequired("trusted_public_keys"),
                            secretKeys: getInputListRequired("secret_keys"),
                            awsAccessKeyId: (0, core_1.getInput)("aws_access_key_id", { required: true }),
                            awsSecretAccessKey: (0, core_1.getInput)("aws_secret_access_key", { required: true }),
                        })];
                case 1:
                    _a = _b.sent(), newConfig = _a.config, credsPath = _a.credsPath;
                    (0, core_1.info)("Saving configuration...");
                    configFName = "".concat(TMP_PREFIX, "nix-config");
                    return [4 /*yield*/, (0, promises_1.writeFile)(configFName, newConfig)];
                case 2:
                    _b.sent();
                    return [4 /*yield*/, system("sudo mkdir -p /etc/nix")];
                case 3:
                    _b.sent();
                    return [4 /*yield*/, system("sudo cat ".concat(configFName, " >> /etc/nix/nix.conf"))];
                case 4:
                    _b.sent();
                    (0, core_1.info)("Restarting nix daemon...");
                    if (!(process_1.platform === "linux")) return [3 /*break*/, 6];
                    return [4 /*yield*/, system("sudo systemctl restart nix-daemon.service")];
                case 5:
                    _b.sent();
                    return [3 /*break*/, 8];
                case 6:
                    if (!(process_1.platform === "darwin")) return [3 /*break*/, 8];
                    return [4 /*yield*/, system("sudo launchctl kickstart -k system/org.nixos.nix-daemon")];
                case 7:
                    _b.sent();
                    _b.label = 8;
                case 8:
                    (0, core_1.info)("Done!");
                    return [2 /*return*/];
            }
        });
    });
}
function cleanup() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    (0, core_1.info)("Removing temporary files...");
                    return [4 /*yield*/, system("sudo rm -rf ".concat(TMP_PREFIX, "*"))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
if (process.env.STATE_isCleanup === "true")
    cleanup();
else
    run();
