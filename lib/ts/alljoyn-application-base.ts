namespace AJ {
    export abstract class ApplicationBase {
        public abstract _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric);
        public abstract GetId(): Uint8Array;
        public abstract GetName(): string;
        public abstract GetDeviceId(): string;
        public abstract GetDeviceName(): string;
        public abstract GetManufacturer(): string;
        public abstract GetModelNumber(): string;
        public abstract GetDescription(): string;
        public abstract GetIcon(): Uint8Array;
        public abstract GetIconUrl(): string;
        public abstract GetIconVersion(): number;
        public abstract GetIconMimeType(): string;
        public abstract GetIntrospectionXml(): string;
    };
}
