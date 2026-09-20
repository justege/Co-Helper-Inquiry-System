import { SaveOptions, XmlLibError, XmlOutputBufferHandler } from './libxml2.mjs';
import { XmlElement, type XmlNode } from './nodes.mjs';
import { NamespaceMap, XmlXPath } from './xpath.mjs';
import { XmlDisposable } from './disposable.mjs';
import { XmlDtd } from './dtd.mjs';
export declare enum ParseOption {
    XML_PARSE_DEFAULT = 0,
    /** recover on errors */
    XML_PARSE_RECOVER = 1,
    /** substitute entities */
    XML_PARSE_NOENT = 2,
    /** load the external subset */
    XML_PARSE_DTDLOAD = 4,
    /** default DTD attributes */
    XML_PARSE_DTDATTR = 8,
    /** validate with the DTD */
    XML_PARSE_DTDVALID = 16,
    /** suppress error reports */
    XML_PARSE_NOERROR = 32,
    /** suppress warning reports */
    XML_PARSE_NOWARNING = 64,
    /** pedantic error reporting */
    XML_PARSE_PEDANTIC = 128,
    /** remove blank nodes */
    XML_PARSE_NOBLANKS = 256,
    /** use the SAX1 interface internally */
    XML_PARSE_SAX1 = 512,
    /** Implement XInclude substitution  */
    XML_PARSE_XINCLUDE = 1024,
    /** Forbid network access */
    XML_PARSE_NONET = 2048,
    /** Do not reuse the context dictionary */
    XML_PARSE_NODICT = 4096,
    /** remove redundant namespaces declarations */
    XML_PARSE_NSCLEAN = 8192,
    /** merge CDATA as text nodes */
    XML_PARSE_NOCDATA = 16384,
    /** do not generate XINCLUDE START/END nodes */
    XML_PARSE_NOXINCNODE = 32768,
    /** compact small text nodes;
     * no modification of the tree allowed afterward
     * (will possibly crash if you try to modify the tree)
     */
    XML_PARSE_COMPACT = 65536,
    /** parse using XML-1.0 before update 5 */
    XML_PARSE_OLD10 = 131072,
    /** do not fixup XINCLUDE xml:base uris */
    XML_PARSE_NOBASEFIX = 262144,
    /** relax any hardcoded limit from the parser */
    XML_PARSE_HUGE = 524288,
    XML_PARSE_OLDSAX = 1048576,
    /** ignore internal document encoding hint */
    XML_PARSE_IGNORE_ENC = 2097152,
    /** Store big lines numbers in text PSVI field */
    XML_PARSE_BIG_LINES = 4194304,
    /** disable loading of external content */
    XML_PARSE_NO_XXE = 8388608,
    /** allow compressed content */
    XML_PARSE_UNZIP = 16777216,
    /** disable global system catalog */
    XML_PARSE_NO_SYS_CATALOG = 33554432,
    /** allow catalog PIs */
    XML_PARSE_CATALOG_PI = 67108864
}
export interface ParseOptions {
    /**
     * The URL of the document.
     *
     * It can be used as a base to calculate the URL of other included documents.
     */
    url?: string;
    encoding?: string;
    option?: ParseOption;
}
export declare class XmlParseError extends XmlLibError {
}
/**
 * The XML document.
 */
export declare class XmlDocument extends XmlDisposable<XmlDocument> {
    /** Create a new document from scratch.
     * To parse an existing xml, use {@link fromBuffer} or {@link fromString}.
     */
    static create(): XmlDocument;
    /**
     * Parse and create an {@link XmlDocument} from an XML string.
     * @param source The XML string
     */
    static fromString(source: string, options?: ParseOptions): XmlDocument;
    /**
     * Parse and create an {@link XmlDocument} from an XML buffer.
     * @param source The XML buffer
     * @param options Parsing options
     */
    static fromBuffer(source: Uint8Array, options?: ParseOptions): XmlDocument;
    /**
     * Save the XmlDocument to a string
     * @param options options to adjust the saving behavior
     * @see {@link save}
     * @see {@link XmlElement#toString}
     */
    toString(options?: SaveOptions): string;
    /**
     * Save the XmlDocument to a buffer and invoke the callbacks to process.
     *
     * @deprecated Use `save` instead.
     */
    toBuffer(handler: XmlOutputBufferHandler, options?: SaveOptions): void;
    /**
     * Save the XmlDocument to a buffer and invoke the callbacks to process.
     *
     * @param handler handlers to process the content in the buffer
     * @param options options to adjust the saving behavior
     * @see {@link toString}
     * @see {@link XmlElement#save}
     */
    save(handler: XmlOutputBufferHandler, options?: SaveOptions): void;
    /**
     * Find the first descendant node of root element matching the given compiled xpath selector.
     * @param xpath XPath selector
     * @returns null if not found, otherwise an instance of the subclass of {@link XmlNode}.
     * @see
     *  - {@link XmlNode#get | XmlNode.get}
     *  - {@link XmlXPath.compile | XmlXPath.compile}
     *  - {@link find}
     *  - {@link eval}
     */
    get(xpath: XmlXPath): XmlNode | null;
    /**
     * Find the first descendant node of root element matching the given xpath selector.
     * @param xpath XPath selector
     * @param namespaces mapping between prefix and the namespace URI, used in the XPath
     * @returns null if not found, otherwise an instance of the subclass of {@link XmlNode}.
     * @see
     *  - {@link XmlNode#get | XmlNode.get}
     *  - {@link find}
     *  - {@link eval}
     */
    get(xpath: string, namespaces?: NamespaceMap): XmlNode | null;
    /**
     * Find all the descendant nodes of root element matching the given compiled xpath selector.
     * @param xpath Compiled XPath selector
     * @returns An empty array if no nodes are found.
     * @see
     *  - {@link XmlNode#find | XmlNode.find}
     *  - {@link get}
     *  - {@link eval}
     */
    find(xpath: XmlXPath): XmlNode[];
    /**
     * Find all the descendant nodes of root element matching the given xpath selector.
     * @param xpath XPath selector
     * @param namespaces mapping between prefix and the namespace URI, used in the XPath
     * @returns An empty array if no nodes are found.
     * @see
     *  - {@link XmlNode#find | XmlNode.find}
     *  - {@link get}
     *  - {@link eval}
     */
    find(xpath: string, namespaces?: NamespaceMap): XmlNode[];
    /**
     * Evaluate the given XPath selector on the root element.
     * @param xpath XPath selector
     * @see
     *  - {@link XmlNode#get | XmlNode.get}
     *  - {@link XmlXPath.compile | XmlXPath.compile}
     *  - {@link get}
     *  - {@link find}
     */
    eval(xpath: XmlXPath): XmlNode[] | string | boolean | number;
    /**
     * Evaluate the given XPath selector on the root element.
     * @param xpath XPath selector
     * @see
     *  - {@link XmlNode#get | XmlNode.get}
     *  - {@link get}
     *  - {@link find}
     */
    eval(xpath: string, namespaces?: NamespaceMap): XmlNode[] | string | boolean | number;
    /**
     * Get the DTD of the document.
     * @returns The DTD of the document, or null if the document has no DTD.
     */
    get dtd(): XmlDtd | null;
    /**
     * The root element of the document.
     * If the document is newly created and hasn’t been set up with a root,
     * an {@link XmlError} will be thrown.
     */
    get root(): XmlElement;
    /**
     * Set the root element of the document.
     * @param value The new root.
     * If the node is from another document,
     * it and its subtree will be removed from the previous document.
     */
    set root(value: XmlElement);
    /**
     * Create the root element.
     * @param name The name of the root element.
     * @param namespace The namespace of the root element.
     * @param prefix The prefix of the root node that represents the given namespace.
     * If not provided, the given namespace will be the default.
     */
    createRoot(name: string, namespace?: string, prefix?: string): XmlElement;
    /**
     * Process the XInclude directives in the document synchronously.
     *
     * @returns the number of XInclude nodes processed.
     */
    processXInclude(): number;
}
