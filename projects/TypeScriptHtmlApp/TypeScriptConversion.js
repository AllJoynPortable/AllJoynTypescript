function ConvertTsToJs(input) {
    var w = window;
    var filename = 'file.ts';
    // this is how to parse single file to a tree
    //var tree = w.ts.createSourceFile('dummy.ts',
    //    input,
    //    false /* is .d.ts? */,
    //    false);
    var SingleFileServiceHost = (function () {
        function SingleFileServiceHost(options, filename, contents) {
            var _this = this;
            this.options = options;
            this.filename = filename;
            this.getCompilationSettings = function () { return _this.options; };
            this.getScriptFileNames = function () { return [_this.filename]; };
            this.getScriptVersion = function () { return '1'; };
            this.getScriptSnapshot = function (name) { return name === _this.filename ? _this.file : _this.lib; };
            this.getCurrentDirectory = function () { return ''; };
            this.getDefaultLibFileName = function () { return 'lib.d.ts'; };
            this.file = w.ts.ScriptSnapshot.fromString(input);
            this.lib = w.ts.ScriptSnapshot.fromString('');
            this.log = function (text) {
                console.log(" ERROR: " + text);
            };
            this.getCancellationToken = function () { return null; };
            this.getLocalizedDiagnosticMessages = function () { return null; };
            this.getSourceFile = function (name) { return name == _this.filename ? _this.programText : " var a: string;"; };
        }
        return SingleFileServiceHost;
    })();
    var serviceHost = new SingleFileServiceHost([{ noResolve: true }], filename, input);
    var service = (new w.ts.createLanguageService(serviceHost));
    var output = service.getEmitOutput(filename);
    return output.outputFiles[0].text;
}
//# sourceMappingURL=TypeScriptConversion.js.map