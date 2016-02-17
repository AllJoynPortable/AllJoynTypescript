namespace AJ {
    export class Application extends ApplicationBase {
        public _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric) { }
        public GetId(): Uint8Array { return null; }
        public GetName(): string { return ""; }
        public GetDeviceId(): string { return ""; }
        public GetDeviceName(): string { return ""; }
        public GetManufacturer(): string { return ""; }
        public GetModelNumber(): string { return ""; }
        public GetDescription(): string { return ""; }
        public GetIcon(): Uint8Array { return null; }
        public GetIconUrl(): string { return ""; }
        public GetIconVersion(): number { return 1; }
        public GetIconMimeType(): string { return ""; }
        public GetIntrospectionXml(): string { return ""; }
    };
}
