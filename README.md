
# MySql2 Combined with nestjs

For more detail look at [MySql2](https://www.npmjs.com/package/mysql2#using-connection-pools)


```javascript
@Module({
  imports: [
    NestMysql2Module.register({
      host: "localhost",
      port: 30006,
      user: "root",
      password: "example"
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
```


Then in your `controller`:

```javascript
constructor(
    @InjectMysql()
    private readonly mysql: Mysql
  ) { }
```


```javascript
const [result, fields] = await this.mysql.query("SELECT 1+2");

```