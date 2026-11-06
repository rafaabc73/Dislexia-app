#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

static NSString *EnsureStudentFolders(void) {
    NSFileManager *fm = [NSFileManager defaultManager];
    NSArray<NSString *> *docsPaths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
    NSString *docsDir = docsPaths.firstObject ?: [NSHomeDirectory() stringByAppendingPathComponent:@"Documents"];
    NSString *baseDir = [docsDir stringByAppendingPathComponent:@"Pastas_do_Aluno"];

    NSArray<NSString *> *years = @[
        @"2025 - 6º Ano", @"2026 - 7º Ano", @"2027 - 8º Ano", @"2028 - 9º Ano",
        @"Ensino Médio - 1º Ano", @"Ensino Médio - 2º Ano", @"Ensino Médio - 3º Ano"
    ];
    NSArray<NSString *> *subjects = @[
        @"Informacoes_Gerais_Boletim", @"Lingua_Portuguesa", @"Matematica", @"Ciencias_Biologia",
        @"Historia", @"Geografia", @"Lingua_Inglesa", @"Fisica", @"Quimica", @"Redacao_e_Leitura", @"Artes"
    ];
    NSArray<NSString *> *months = @[
        @"01_Janeiro", @"02_Fevereiro", @"03_Marco", @"04_Abril", @"05_Maio", @"06_Junho",
        @"07_Julho", @"08_Agosto", @"09_Setembro", @"10_Outubro", @"11_Novembro", @"12_Dezembro"
    ];

    for (NSString *yr in years) {
        for (NSString *subj in subjects) {
            NSString *subjPath = [[baseDir stringByAppendingPathComponent:yr] stringByAppendingPathComponent:subj];
            [fm createDirectoryAtPath:[subjPath stringByAppendingPathComponent:@"Provas"]
          withIntermediateDirectories:YES
                           attributes:nil
                                error:nil];
            for (NSString *m in months) {
                [fm createDirectoryAtPath:[subjPath stringByAppendingPathComponent:m]
              withIntermediateDirectories:YES
                               attributes:nil
                                    error:nil];
            }
        }
    }
    return baseDir;
}

@interface NativeFsHandler : NSObject <WKScriptMessageHandler>
@property (nonatomic, copy) NSString *baseDirPath;
@end

@implementation NativeFsHandler
- (void)userContentController:(WKUserContentController *)userContentController
      didReceiveScriptMessage:(WKScriptMessage *)message {
    if (![message.body isKindOfClass:[NSDictionary class]]) return;
    NSDictionary *dict = (NSDictionary *)message.body;

    NSDictionary<NSString *, NSString *> *subjectMap = @{
        @"informacoes_gerais": @"Informacoes_Gerais_Boletim",
        @"portugues": @"Lingua_Portuguesa",
        @"matematica": @"Matematica",
        @"ciencias": @"Ciencias_Biologia",
        @"historia": @"Historia",
        @"geografia": @"Geografia",
        @"ingles": @"Lingua_Inglesa",
        @"fisica": @"Fisica",
        @"quimica": @"Quimica",
        @"redacao": @"Redacao_e_Leitura",
        @"artes": @"Artes"
    };
    NSDictionary<NSNumber *, NSString *> *monthMap = @{
        @1: @"01_Janeiro", @2: @"02_Fevereiro", @3: @"03_Marco", @4: @"04_Abril",
        @5: @"05_Maio", @6: @"06_Junho", @7: @"07_Julho", @8: @"08_Agosto",
        @9: @"09_Setembro", @10: @"10_Outubro", @11: @"11_Novembro", @12: @"12_Dezembro"
    };

    NSString *year = [dict[@"year"] isKindOfClass:[NSString class]] ? dict[@"year"] : @"2026 - 7º Ano";
    NSString *subjectId = [dict[@"subjectId"] isKindOfClass:[NSString class]] ? dict[@"subjectId"] : @"portugues";
    NSString *subjFolder = subjectMap[subjectId] ?: subjectId;
    BOOL isExam = [dict[@"isExam"] respondsToSelector:@selector(boolValue)] ? [dict[@"isExam"] boolValue] : NO;
    NSInteger month = [dict[@"month"] respondsToSelector:@selector(integerValue)] ? [dict[@"month"] integerValue] : 1;
    NSString *subFolder = isExam ? @"Provas" : (monthMap[@(month)] ?: @"01_Janeiro");

    NSString *rawFileName = [dict[@"fileName"] isKindOfClass:[NSString class]] ? dict[@"fileName"] : @"documento.txt";
    NSString *safeFileName = [rawFileName stringByReplacingOccurrencesOfString:@"/" withString:@"_"];
    NSString *formattedDate = [dict[@"formattedDate"] isKindOfClass:[NSString class]]
        ? [dict[@"formattedDate"] stringByReplacingOccurrencesOfString:@"/" withString:@"-"]
        : @"";
    NSString *finalName = formattedDate.length > 0
        ? [NSString stringWithFormat:@"%@_%@", formattedDate, safeFileName]
        : safeFileName;

    NSString *targetFolder = [[[self.baseDirPath stringByAppendingPathComponent:year]
        stringByAppendingPathComponent:subjFolder]
        stringByAppendingPathComponent:subFolder];

    [[NSFileManager defaultManager] createDirectoryAtPath:targetFolder
                              withIntermediateDirectories:YES
                                               attributes:nil
                                                    error:nil];

    NSString *targetFile = [targetFolder stringByAppendingPathComponent:finalName];

    NSString *dataUrl = [dict[@"dataUrl"] isKindOfClass:[NSString class]] ? dict[@"dataUrl"] : nil;
    if (dataUrl) {
        NSRange commaRange = [dataUrl rangeOfString:@","];
        if (commaRange.location != NSNotFound) {
            NSString *b64 = [dataUrl substringFromIndex:commaRange.location + 1];
            NSData *data = [[NSData alloc] initWithBase64EncodedString:b64 options:NSDataBase64DecodingIgnoreUnknownCharacters];
            if (data) {
                [data writeToFile:targetFile atomically:YES];
                return;
            }
        }
    }

    NSString *extractedText = [dict[@"extractedText"] isKindOfClass:[NSString class]] ? dict[@"extractedText"] : nil;
    if (extractedText) {
        [extractedText writeToFile:targetFile atomically:YES encoding:NSUTF8StringEncoding error:nil];
    }
}
@end

@interface AppDelegate : NSObject <NSApplicationDelegate, WKUIDelegate, WKNavigationDelegate>
@property (nonatomic, strong) NSWindow *window;
@property (nonatomic, strong) WKWebView *webView;
@end

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
    NSString *baseDirPath = EnsureStudentFolders();
    [self setupMainMenu];

    NSRect screenRect = [NSScreen mainScreen] ? [[NSScreen mainScreen] visibleFrame] : NSMakeRect(0, 0, 1440, 900);
    CGFloat width = MIN(1440.0, MAX(1024.0, screenRect.size.width * 0.92));
    CGFloat height = MIN(900.0, MAX(680.0, screenRect.size.height * 0.90));
    NSRect winRect = NSMakeRect(
        screenRect.origin.x + (screenRect.size.width - width) / 2.0,
        screenRect.origin.y + (screenRect.size.height - height) / 2.0,
        width,
        height
    );

    NSWindowStyleMask style = NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskMiniaturizable | NSWindowStyleMaskResizable;
    self.window = [[NSWindow alloc] initWithContentRect:winRect
                                              styleMask:style
                                                backing:NSBackingStoreBuffered
                                                  defer:NO];
    self.window.title = @"Dislexia App — Estudo Limpo e Focado";
    self.window.minSize = NSMakeSize(900, 600);

    WKUserContentController *contentController = [[WKUserContentController alloc] init];
    NativeFsHandler *fsHandler = [[NativeFsHandler alloc] init];
    fsHandler.baseDirPath = baseDirPath;
    [contentController addScriptMessageHandler:fsHandler name:@"nativeFs"];

    NSString *escapedPath = [[baseDirPath stringByReplacingOccurrencesOfString:@"\\" withString:@"\\\\"]
        stringByReplacingOccurrencesOfString:@"\"" withString:@"\\\""];
    NSString *jsSource = [NSString stringWithFormat:@"window.__NATIVE_DESKTOP_BASE_DIR__ = \"%@\";", escapedPath];
    WKUserScript *initScript = [[WKUserScript alloc] initWithSource:jsSource
                                                      injectionTime:WKUserScriptInjectionTimeAtDocumentStart
                                                   forMainFrameOnly:NO];
    [contentController addUserScript:initScript];

    WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
    config.userContentController = contentController;
    [config.preferences setValue:@YES forKey:@"allowFileAccessFromFileURLs"];

    self.webView = [[WKWebView alloc] initWithFrame:self.window.contentView.bounds configuration:config];
    self.webView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    self.webView.UIDelegate = self;
    self.webView.navigationDelegate = self;

    [self.window.contentView addSubview:self.webView];
    [self.window makeKeyAndOrderFront:nil];
    [NSApp activateIgnoringOtherApps:YES];

    NSURL *htmlURL = [[NSBundle mainBundle] URLForResource:@"standalone" withExtension:@"html"];
    if (htmlURL) {
        [self.webView loadFileURL:htmlURL allowingReadAccessToURL:[htmlURL URLByDeletingLastPathComponent]];
    }
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender {
    return YES;
}

- (void)webView:(WKWebView *)webView
runOpenPanelWithParameters:(WKOpenPanelParameters *)parameters
initiatedByFrame:(WKFrameInfo *)frame
completionHandler:(void (^)(NSArray<NSURL *> * _Nullable))completionHandler {
    NSOpenPanel *panel = [NSOpenPanel openPanel];
    panel.canChooseFiles = YES;
    panel.canChooseDirectories = NO;
    panel.allowsMultipleSelection = parameters.allowsMultipleSelection;
    [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse result) {
        if (result == NSModalResponseOK) {
            completionHandler(panel.URLs);
        } else {
            completionHandler(nil);
        }
    }];
}

- (void)setupMainMenu {
    NSMenu *mainMenu = [[NSMenu alloc] init];

    NSMenuItem *appMenuItem = [[NSMenuItem alloc] init];
    [mainMenu addItem:appMenuItem];
    NSMenu *appMenu = [[NSMenu alloc] init];
    [appMenu addItemWithTitle:@"Sobre o Dislexia App" action:@selector(orderFrontStandardAboutPanel:) keyEquivalent:@""];
    [appMenu addItem:[NSMenuItem separatorItem]];
    [appMenu addItemWithTitle:@"Ocultar Dislexia App" action:@selector(hide:) keyEquivalent:@"h"];
    [appMenu addItem:[NSMenuItem separatorItem]];
    [appMenu addItemWithTitle:@"Sair do Dislexia App" action:@selector(terminate:) keyEquivalent:@"q"];
    appMenuItem.submenu = appMenu;

    NSMenuItem *editMenuItem = [[NSMenuItem alloc] init];
    [mainMenu addItem:editMenuItem];
    NSMenu *editMenu = [[NSMenu alloc] initWithTitle:@"Editar"];
    [editMenu addItemWithTitle:@"Desfazer" action:NSSelectorFromString(@"undo:") keyEquivalent:@"z"];
    [editMenu addItemWithTitle:@"Refazer" action:NSSelectorFromString(@"redo:") keyEquivalent:@"Z"];
    [editMenu addItem:[NSMenuItem separatorItem]];
    [editMenu addItemWithTitle:@"Recortar" action:@selector(cut:) keyEquivalent:@"x"];
    [editMenu addItemWithTitle:@"Copiar" action:@selector(copy:) keyEquivalent:@"c"];
    [editMenu addItemWithTitle:@"Colar" action:@selector(paste:) keyEquivalent:@"v"];
    [editMenu addItemWithTitle:@"Selecionar Tudo" action:@selector(selectAll:) keyEquivalent:@"a"];
    editMenuItem.submenu = editMenu;

    [NSApp setMainMenu:mainMenu];
}

@end

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        NSApplication *app = [NSApplication sharedApplication];
        [app setActivationPolicy:NSApplicationActivationPolicyRegular];
        AppDelegate *delegate = [[AppDelegate alloc] init];
        app.delegate = delegate;
        [app run];
    }
    return 0;
}

