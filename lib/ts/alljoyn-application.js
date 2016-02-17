var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var AJ;
(function (AJ) {
    var Application = (function (_super) {
        __extends(Application, _super);
        function Application() {
            _super.apply(this, arguments);
        }
        Application.prototype._ProcessMsg = function (connection, msg) { };
        Application.prototype.GetId = function () { return null; };
        Application.prototype.GetName = function () { return ""; };
        Application.prototype.GetDeviceId = function () { return ""; };
        Application.prototype.GetDeviceName = function () { return ""; };
        Application.prototype.GetManufacturer = function () { return ""; };
        Application.prototype.GetModelNumber = function () { return ""; };
        Application.prototype.GetDescription = function () { return ""; };
        Application.prototype.GetIcon = function () { return null; };
        Application.prototype.GetIconUrl = function () { return ""; };
        Application.prototype.GetIconVersion = function () { return 1; };
        Application.prototype.GetIconMimeType = function () { return ""; };
        Application.prototype.GetIntrospectionXml = function () { return ""; };
        return Application;
    }(AJ.ApplicationBase));
    AJ.Application = Application;
    ;
})(AJ || (AJ = {}));
//# sourceMappingURL=alljoyn-application.js.map